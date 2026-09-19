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
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// خريطة لتخزين ملكية الرومات (ChannelID -> OwnerID)
const roomOwners = new Map();
const CREATOR_CHANNEL_ID = process.env.CREATOR_CHANNEL_ID;

client.once('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
});

// مراقبة الأحداث الصوتية (دخول وخروج)
client.on('voiceStateUpdate', async (oldState, newState) => {
    const member = newState.member;
    const guild = newState.guild;

    // 1. عند دخول المستخدم لروم الإنشاء الأساسي
    if (newState.channelId === CREATOR_CHANNEL_ID) {
        try {
            const voiceChannel = await guild.channels.create({
                name: `🔊 | ${member.user.username}`,
                type: ChannelType.GuildVoice,
                parent: newState.channel.parent, // يُنشأ في نفس الفئة (Category)
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

            // حفظ مالك الروم
            roomOwners.set(voiceChannel.id, member.id);

            // نقل المستخدم إلى رومه الجديد
            await member.voice.setChannel(voiceChannel);

            // إرسال لوحة التحكم التفاعلية بالأزرار داخل الروم الصوتي
            const embed = new EmbedBuilder()
                .setTitle('🎛️ لوحة تحكم الغرفة الصوتية')
                .setDescription('مرحباً بك في غرفتك الخاصة! استخدم الأزرار أدناه للتحكم بكافة إعدادات الروم:')
                .setColor('#ed4245')
                .setFooter({ text: 'TempVoice System Professional' });

            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`lock_${voiceChannel.id}`).setLabel('قفل').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
                new ButtonBuilder().setCustomId(`unlock_${voiceChannel.id}`).setLabel('فتح').setStyle(ButtonStyle.Success).setEmoji('🔓'),
                new ButtonBuilder().setCustomId(`name_${voiceChannel.id}`).setLabel('تغيير الاسم').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
                new ButtonBuilder().setCustomId(`limit_${voiceChannel.id}`).setLabel('العدد').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
                new ButtonBuilder().setCustomId(`hide_${voiceChannel.id}`).setLabel('إخفاء').setStyle(ButtonStyle.Danger).setEmoji('👁️‍🗨️')
            );

            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`unhide_${voiceChannel.id}`).setLabel('إظهار').setStyle(ButtonStyle.Success).setEmoji('👁️'),
                new ButtonBuilder().setCustomId(`kick_${voiceChannel.id}`).setLabel('طرد').setStyle(ButtonStyle.Danger).setEmoji('👢')
            );

            await voiceChannel.send({ embeds: [embed], components: [row1, row2] });

        } catch (error) {
            console.error('خطأ أثناء إنشاء الروم المؤقت:', error);
        }
    }

    // 2. الحذف التلقائي للروم عند خروج الجميع منه
    if (oldState.channel && oldState.channel.id !== CREATOR_CHANNEL_ID) {
        const oldChannel = oldState.channel;
        if (roomOwners.has(oldChannel.id) && oldChannel.members.size === 0) {
            await oldChannel.delete().catch(() => {});
            roomOwners.delete(oldChannel.id);
        }
    }
});

// التعامل مع الأزرار والنوافذ المنبثقة
client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        const [action, channelId] = interaction.customId.split('_');
        const ownerId = roomOwners.get(channelId);
        const channel = interaction.guild.channels.cache.get(channelId);

        // التحقق أن المستخدم هو صاحب الروم حصراً
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

    // معالجة الردود على النوافذ المنبثقة (Modals)
    if (interaction.isModalSubmit()) {
        const [type, action, channelId] = interaction.customId.split('_');
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
