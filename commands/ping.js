const { SlashCommandBuilder } = require('@discordjs/builders')
const { reply } = require('../helpers/interactionHelper')

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with Pong!'),
  async execute (interaction) {
    await reply(interaction, { content: 'pong', allowedMentions: { repliedUser: false } })
  }
}
