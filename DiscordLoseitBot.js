// Import relevant classes from discord.js
const { Client, GatewayIntentBits, Collection } = require('discord.js')
const { REST } = require('@discordjs/rest')
const { Routes } = require('discord-api-types/v9')
// Import commands
// Import helpers
const log = require('./helpers/logger')
const { foemp } = require('./helpers/foemp')
const { startTasksAsync } = require('./tasks')
const { onMemberJoinAsync } = require('./eventHandlers/onMemberJoin')
const { getAllCommandsSync } = require('./helpers/metadataHelper')
const { addAutocompleteOptions } = require('./helpers/autoCompleteHelper')

// Setup our environment variables via dotenv
require('dotenv').config()

const PREFIX = process.env.PREFIX
const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.CLIENT_ID
const GUILD_ID = process.env.GUILD_ID

if (PREFIX) {
  log.info(`Start bot with prefix '${PREFIX}'.`)
} else {
  const err = new Error('Failed to start bot! No PREFIX found in .env file.')
  log.error(err)
  throw err
}

if (CLIENT_ID) {
  log.info(`Start bot with client id '${CLIENT_ID}'.`)
} else {
  const err = new Error('Failed to start bot! No CLIENT_ID found in .env file.')
  log.error(err)
  throw err
}

const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN)

// Instantiate a new client with some necessary parameters.
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates
  ]
})
// Load commands
const commands = []
client.commands = new Collection()
const cmds = getAllCommandsSync()
for (const command of cmds) {
  commands.push(command.data.toJSON())
  client.commands.set(command.data.name, command)
}
// Register commands
(async function () {
  try {
    log.info('Started refreshing application (/) commands!')

    // if a GUILD ID for a test server is defined, we should use the applicationGuildCommands routes as it updates the commands instantly
    if (!GUILD_ID) {
      await rest.put(
        Routes.applicationCommands(CLIENT_ID),
        { body: commands }
      )
    } else {
      await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
      )
    }

    log.info('Successfully reloaded application (/) commands.')
  } catch (error) {
    log.error(error)
  }
})()

// Helper functions for handlers
async function executeCommand (interaction) {
  const command = client.commands.get(interaction.commandName)
  if (!command) {
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    log.error(error)
    const reply = { content: `Da kennek nie ${foemp(interaction)}!`, ephemeral: true }
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(reply)
    } else {
      await interaction.reply(reply)
    }
  }
}

async function populateAutocomplete (interaction) {
  addAutocompleteOptions(interaction)
}

// Notify progress
client.on('ready', _ => {
  log.info(`Logged in as ${client.user.tag}!`)

  // start tasks
  startTasksAsync(client) // no need to await
})

client.on('messageCreate', (message) => {
  if (!message.author.bot && message.content.startsWith(PREFIX)) {
    const replyText = 'Hallo!\n' +
      'Het bot team is enthousiast om mee te delen dat we een stevige update hebben doorgevoerd!\n' +
      'Vanaf nu gebruikt onze bot niet langer de verouderde text commands, maar zijn we overgeschakeld op de in discord geintegreerde slash commands.\n' +
      'Je kan deze gebruiken door te beginnen met een / te typen, en discord zal dan automatisch aanvullen met de beschikbare opties.\n' +
      'Indien je een overzichtje wilt van enkel de opties van de nerdlandbot, kan je alvast `/help` gebruiken!'

    message.reply(replyText)
  }
})

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    executeCommand(interaction)
  } else if (interaction.isAutocomplete()) {
    populateAutocomplete(interaction)
  }
})

client.on('guildMemberAdd', async member => {
  try {
    await onMemberJoinAsync(member, client)
  } catch (error) {
    log.error(error)
  }
})

// Authenticate
client.login(process.env.DISCORD_TOKEN)
