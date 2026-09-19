const { 
    Client, 
    GatewayIntentBits, 
    ChannelType, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionsBitField, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
const express = require('express'); // استخدام express لضمان استجابة البورت في Render
require('dotenv').config();

const app = express();
app.get('/', (req, res) => {
    res.send('Bot is active and running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌍 Server is listening on port ${PORT}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const roomOwners = new Map();
const CREATOR_CHANNEL_ID = process.env.CREATOR_CHANNEL_ID;

client.once('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member;
    const guild = newState.guild;

    if (newState.channelId === CREATOR_CHANNEL_ID) {
        try {
            const voiceChannel = await guild.channels.create({
                name: `🔊 | ${member.user.username}`,
                type: ChannelType.GuildVoice,
                parent: newState.channel.parent,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        allow: [PermissionsBitField.Flags.Connect, PermissionsBitField.Flags.Speak],
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.MuteMembers,
                            PermissionsBitField.Flags.DeafenMembers,
                            PermissionsBitField.Flags.MoveMembers,
                            PermissionsBitField.Flags.ManageRoles
                        ],
                    },
                ],
            });

            roomOwners.set(voiceChannel.id, member.id);
            await member.voice.setChannel(voiceChannel);

            const embed = new EmbedBuilder()
                .setTitle('🎛️ لوحة تحكم الغرفة الصوتية')
                .setDescription('مرحباً بك في غرفتك الخاصة! استخدم الأزرار أدناه للتحكم بكافة إعدادات الروم:')
                .setColor('#ed4245')
                .setFooter({ text: 'TempVoice System Professional' });

            // استخدام أزرار بدون إيموجيات معقدة لتجنب خطأ الـ API
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lock_${voiceChannel.id}`).setLabel('قفل 🔒').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`unlock_${voiceChannel.id}`).setLabel('فتح 🔓').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`name_${voiceChannel.id}`).setLabel('تعديل الاسم ✏️').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`limit_${voiceChannel.id}`).setLabel('العدد 👥').setStyle(ButtonStyle.Secondary)
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`hide_${voiceChannel.id}`).setLabel('إخفاء 👁️‍🗨️').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId(`unhide_${voiceChannel.id}`).setLabel('إظهار 👁️').setStyle(ButtonStyle.Success)
            );

            await voiceChannel.send({ embeds: [embed], components: [row1, row2] });

        } catch (error) {
            console.error('خطأ أثناء إنشاء الروم المؤقت:', error);
        }
    }

    if (oldState.channel && oldState.channel.id !== CREATOR_CHANNEL_ID) {
        const oldChannel = oldState.channel;
        if (roomOwners.has(oldChannel.id) && oldChannel.members.size === 0) {
            await oldChannel.delete().catch(() => {});
            roomOwners.delete(oldChannel.id);
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const channelId = parts.slice(1).join('_'); // للتعامل الآمن مع الآي دي
        
        const ownerId = roomOwners.get(channelId);
        const channel = interaction.guild.channels.cache.get(channelId);

        if (interaction.user.id !== ownerId) {
            return interaction.reply({ content: '❌ عذراً، هذه الأزرار مخصصة لصاحب الغرفة فقط!', ephemeral: true });
        }

        if (!channel) {
            return interaction.reply({ content: '❌ الروم غير موجود أو تم حذفه مسبقاً.', ephemeral: true });
        }

        switch (action) {
            case 'lock':
                await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: false });
                return interaction.reply({ content: '🔒 تم قفل الروم بنجاح.', ephemeral: true });

            case 'unlock':
                await channel.permissionOverwrites.edit(interaction.guild.id, { Connect: true });
                return interaction.reply({ content: '🔓 تم فتح الروم بنجاح.', ephemeral: true });

            case 'hide':
                await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false });
                return interaction.reply({ content: '👁️‍🗨️ تم إخفاء الروم عن الأعضاء.', ephemeral: true });

            case 'unhide':
                await channel.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: true });
                return interaction.reply({ content: '👁️ تم إظهار الروم للجميع.', ephemeral: true });

            case 'name': {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_name_${channelId}`)
                    .setTitle('تغيير اسم الغرفة الصوتية');

                const nameInput = new TextInputBuilder()
                    .setCustomId('newName')
                    .setLabel('اكتب الاسم الجديد للروم:')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(30)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                return interaction.showModal(modal);
            }

            case 'limit': {
                const modal = new ModalBuilder()
                    .setCustomId(`modal_limit_${channelId}`)
                    .setTitle('تحديد الحد الأقصى للأعضاء');

                const limitInput = new TextInputBuilder()
                    .setCustomId('newLimit')
                    .setLabel('اكتب العدد (من 0 إلى 99):')
                    .setStyle(TextInputStyle.Short)
                    .setMaxLength(2)
                    .setRequired(true);

                modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                return interaction.showModal(modal);
            }
        }
    }

    if (interaction.isModalSubmit()) {
        const parts = interaction.customId.split('_');
        const action = parts[1];
        const channelId = parts.slice(2).join('_');
        const channel = interaction.guild.channels.cache.get(channelId);

        if (!channel) return interaction.reply({ content: '❌ الروم غير موجود.', ephemeral: true });

        if (action === 'name') {
            const newName = interaction.fields.getTextInputValue('newName');
            await channel.setName(newName);
            return interaction.reply({ content: `✅ تم تحديث اسم الروم إلى: **${newName}**`, ephemeral: true });
        }

        if (action === 'limit') {
            const limitVal = parseInt(interaction.fields.getTextInputValue('newLimit'));
            if (isNaN(limitVal) || limitVal < 0 || limitVal > 99) {
                return interaction.reply({ content: '❌ الرجاء إدخال رقم صحيح بين 0 و 99.', ephemeral: true });
            }
            await channel.setUserLimit(limitVal);
            return interaction.reply({ content: `✅ تم ضبط أقصى عدد للأعضاء على: **${limitVal}**`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
