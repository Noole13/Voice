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
    TextInputStyle,
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');
const express = require('express');
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

const ownedChannels = new Map(); // Map لربط صاحب الروم (UserID) بـ (ChannelID)
const CREATOR_CHANNEL_ID = process.env.CREATOR_CHANNEL_ID;

// تسجيل أمر الـ Slash Command وتأكيد التشغيل
client.once('ready', async () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('setup')
            .setDescription('إرسال لوحة تحكم الرومات المؤقتة الاحترافية')
    ];

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        console.log('✅ تم تسجيل أمر /setup بنجاح!');
    } catch (error) {
        console.error(error);
    }
});

// إرسال لوحة التحكم عبر أمر /setup أو !setup
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!setup') {
        const isOwner = message.guild.ownerId === message.author.id;
        const isAdmin = message.member && message.member.permissions.has(PermissionsBitField.Flags.Administrator);

        if (!isOwner && !isAdmin) {
            return message.reply({ content: '❌ هذا الأمر مخصص لمالك السيرفر وإدارة السيرفر فقط!' });
        }

        await sendSetupPanel(message.channel);
        await message.delete().catch(() => {});
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'setup') {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const isAdmin = interaction.member && interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

            if (!isOwner && !isAdmin) {
                return interaction.reply({ content: '❌ هذا الأمر مخصص لمالك السيرفر وإدارة السيرفر فقط!', ephemeral: true });
            }

            await sendSetupPanel(interaction.channel);
            return interaction.reply({ content: '✅ تم إرسال لوحة التحكم بنجاح!', ephemeral: true });
        }
    }

    // التعامل مع الأزرار الشاملة للتحكم بالغرفة
    if (interaction.isButton()) {
        if (!interaction.customId.startsWith('t_')) return;

        const userId = interaction.user.id;
        const userVoiceChannelId = ownedChannels.get(userId);

        const action = interaction.customId.replace('t_', '');

        // الأزرار التي لا تتطلب امتلاك روم بالضرورة مثل Claim (أخذ الملكية)
        if (action === 'claim') {
            const memberChannel = interaction.member.voice.channel;
            if (!memberChannel) {
                return interaction.reply({ content: '❌ يجب أن تكون داخل روم صوتي لتقوم بالمطالبة به!', ephemeral: true });
            }
            // البحث عما إذا كان الروم مسجلاً وتحت إدارة النظام
            let currentOwnerId = null;
            for (let [ownerId, chId] of ownedChannels.entries()) {
                if (chId === memberChannel.id) {
                    currentOwnerId = ownerId;
                    break;
                }
            }

            const ownerMember = interaction.guild.members.cache.get(currentOwnerId);
            if (ownerMember && ownerMember.voice.channelId === memberChannel.id) {
                return interaction.reply({ content: `❌ لا يمكنك أخذ الملكية لأن المالـك الحقيقي (${ownerMember.user.username}) موجود في الروم!`, ephemeral: true });
            }

            ownedChannels.set(userId, memberChannel.id);
            return interaction.reply({ content: `👑 مبروك! لقد قمت بالمطالبة بروم **${memberChannel.name}** وأصبحت المالك الجديد.`, ephemeral: true });
        }

        if (!userVoiceChannelId) {
            return interaction.reply({ content: '❌ يجب أن تمتلك روم صوتي نشط لكي تعمل معك أزرار التحكم!', ephemeral: true });
        }

        const channel = interaction.guild.channels.cache.get(userVoiceChannelId);
        if (!channel) {
            ownedChannels.delete(userId);
            return interaction.reply({ content: '❌ لم يتم العثور على غرفتك الصوتية النشطة!', ephemeral: true });
        }

        // تنفيذ الأوامر حسب الزر المضغوط
        switch (action) {
            case 'lock': {
                const currentPerms = channel.permissionOverwrites.cache.get(interaction.guild.id);
                const isLocked = currentPerms && currentPerms.deny.has(PermissionsBitField.Flags.Connect);
                await channel.permissionOverwrites.edit(interaction.guild.id, {
                    Connect: isLocked ? null : false
                });
                return interaction.reply({ content: isLocked ? '🔓 تم فتح الروم بنجاح.' : '🔒 تم قفل الروم بنجاح.', ephemeral: true });
            }
            case 'rename': {
                const modal = new ModalBuilder().setCustomId('modal_rename').setTitle('تغيير اسم الغرفة الصوتية');
                const nameInput = new TextInputBuilder().setCustomId('newName').setLabel('اكتب الاسم الجديد للروم:').setStyle(TextInputStyle.Short).setMaxLength(30).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(nameInput));
                return interaction.showModal(modal);
            }
            case 'limit': {
                const modal = new ModalBuilder().setCustomId('modal_limit').setTitle('تحديد الحد الأقصى للأعضاء');
                const limitInput = new TextInputBuilder().setCustomId('newLimit').setLabel('اكتب العدد (من 0 إلى 99):').setStyle(TextInputStyle.Short).setMaxLength(2).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(limitInput));
                return interaction.showModal(modal);
            }
            case 'delete': {
                ownedChannels.delete(userId);
                await channel.delete().catch(() => {});
                return interaction.reply({ content: '🗑️ تم حذف رومك بنجاح.', ephemeral: true });
            }
            case 'hide': {
                const currentPerms = channel.permissionOverwrites.cache.get(interaction.guild.id);
                const isHidden = currentPerms && currentPerms.deny.has(PermissionsBitField.Flags.ViewChannel);
                await channel.permissionOverwrites.edit(interaction.guild.id, {
                    ViewChannel: isHidden ? null : false
                });
                return interaction.reply({ content: isHidden ? '👁️ تم إظهار الروم بنجاح.' : '🙈 تم إخفاء الروم بنجاح.', ephemeral: true });
            }
            case 'bitrate': {
                // رفع/خفض جودة الصوت كـ Toggle سريع
                const currentBitrate = channel.bitrate;
                const newBitrate = currentBitrate === 64000 ? 128000 : 64000;
                await channel.setBitrate(newBitrate);
                return interaction.reply({ content: `⏳ تم تغيير جودة الصوت إلى **${newBitrate / 1000}kbps**`, ephemeral: true });
            }
            case 'status': {
                const modal = new ModalBuilder().setCustomId('modal_status').setTitle('تغيير حالة الروم (وصف)');
                const statusInput = new TextInputBuilder().setCustomId('newStatus').setLabel('اكتب الحالة أو الوصف الجديد:').setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(statusInput));
                return interaction.showModal(modal);
            }
            case 'invite': {
                const invite = await channel.createInvite({ maxUses: 1, unique: true }).catch(() => null);
                if (!invite) return interaction.reply({ content: '❌ عجز البوت عن إنشاء دعوة لهذه الغرفة.', ephemeral: true });
                return interaction.reply({ content: `📞 رابط الدعوة الخاص بغرفتك:\nhttps://discord.gg/${invite.code}`, ephemeral: true });
            }
            default:
                return interaction.reply({ content: '⚙️ هذا الزر قيد التفعيل والربط الكامل.', ephemeral: true });
        }
    }

    // استقبال النوافذ (Modals)
    if (interaction.isModalSubmit()) {
        const userId = interaction.user.id;
        const userVoiceChannelId = ownedChannels.get(userId);
        if (!userVoiceChannelId) return interaction.reply({ content: '❌ لا تملك روم نشط.', ephemeral: true });

        const channel = interaction.guild.channels.cache.get(userVoiceChannelId);
        if (!channel) return interaction.reply({ content: '❌ الروم غير موجود.', ephemeral: true });

        if (interaction.customId === 'modal_rename') {
            const newName = interaction.fields.getTextInputValue('newName');
            await channel.setName(newName);
            return interaction.reply({ content: `✅ تم تغيير اسم الروم إلى: **${newName}**`, ephemeral: true });
        }

        if (interaction.customId === 'modal_limit') {
            const limitVal = parseInt(interaction.fields.getTextInputValue('newLimit'));
            if (isNaN(limitVal) || limitVal < 0 || limitVal > 99) {
                return interaction.reply({ content: '❌ الرجاء إدخال رقم صحيح بين 0 و 99.', ephemeral: true });
            }
            await channel.setUserLimit(limitVal);
            return interaction.reply({ content: `✅ تم تحديث الحد الأقصى إلى: **${limitVal}**`, ephemeral: true });
        }

        if (interaction.customId === 'modal_status') {
            const statusText = interaction.fields.getTextInputValue('newStatus');
            await channel.setTopic(statusText).catch(() => {});
            return interaction.reply({ content: `💬 تم تحديث حالة الروم بنجاح.`, ephemeral: true });
        }
    }
});

// دالة إرسال الإمبيد الفخم والأزرار المتكاملة مطابقة للصور
async function sendSetupPanel(channel) {
    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle('🎛️ ⠇لوحة التحكم المركزية للرومات الصوتية المؤقتة')
        .setDescription('مرحباً بك في نظام إدارة الغرف الصوتية الاحترافي.\nاستخدم الأزرار أدناه للتحكم الكامل بغرفتك (تغيير الاسم، القفل، الحد، الطرد، الحظر، الدعوة، والمزيد).\n\n> ⚠️ **ملاحظة هامة:** يجب أن تكون مالكاً للغرفة الصوتية أو متواجدًا داخلها لتتمكن من استخدام خيارات التحكم.')
        .setFooter({ text: '3RB ROYAL SYSTEM • Voice Management Dashboard', iconURL: channel.guild.iconURL() });

    // الصف الأول من الأزرار (مطابق لطلبك)
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_rename').setLabel('تغيير الاسم').setStyle(ButtonStyle.Secondary).setEmoji('✏️'),
        new ButtonBuilder().setCustomId('t_limit').setLabel('حد الأعضاء').setStyle(ButtonStyle.Secondary).setEmoji('👥'),
        new ButtonBuilder().setCustomId('t_lock').setLabel('الخصوصية').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
        new ButtonBuilder().setCustomId('t_bitrate').setLabel('غرفة الانتظار').setStyle(ButtonStyle.Secondary).setEmoji('⏳')
    );

    // الصف الثاني من الأزرار
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_status').setLabel('حالة الروم').setStyle(ButtonStyle.Secondary).setEmoji('💬'),
        new ButtonBuilder().setCustomId('t_trust').setLabel('الثقة').setStyle(ButtonStyle.Success).setEmoji('🟢'),
        new ButtonBuilder().setCustomId('t_untrust').setLabel('سحب الثقة').setStyle(ButtonStyle.Secondary).setEmoji('👤'),
        new ButtonBuilder().setCustomId('t_invite').setLabel('دعوة').setStyle(ButtonStyle.Primary).setEmoji('📞')
    );

    // الصف الثالث من الأزرار
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_kick').setLabel('طرد').setStyle(ButtonStyle.Danger).setEmoji('٪'),
        new ButtonBuilder().setCustomId('t_ban').setLabel('حظر').setStyle(ButtonStyle.Danger).setEmoji('🚫'),
        new ButtonBuilder().setCustomId('t_unban').setLabel('رفع الحظر').setStyle(ButtonStyle.Success).setEmoji('✅')
    );

    // الصف الرابع من الأزرار
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('t_owner').setLabel('نقل الملكية').setStyle(ButtonStyle.Secondary).setEmoji('⇄'),
        new ButtonBuilder().setCustomId('t_claim').setLabel('أخذ الملكية').setStyle(ButtonStyle.Secondary).setEmoji('👑'),
        new ButtonBuilder().setCustomId('t_delete').setLabel('حذف الروم').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
    );

    await channel.send({ embeds: [embed], components: [row1, row2, row3, row4] });
}

// نظام إنشاء الرومات المؤقتة التلقائي عند دخول روم الصناعة
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

            ownedChannels.set(member.id, voiceChannel.id);
            await member.voice.setChannel(voiceChannel);

        } catch (error) {
            console.error('خطأ أثناء إنشاء الروم المؤقت:', error);
        }
    }

    if (oldState.channel && oldState.channel.id !== CREATOR_CHANNEL_ID) {
        const oldChannel = oldState.channel;
        if (oldChannel.members.size === 0) {
            for (let [userId, channelId] of ownedChannels.entries()) {
                if (channelId === oldChannel.id) {
                    ownedChannels.delete(userId);
                    break;
                }
            }
            await oldChannel.delete().catch(() => {});
        }
    }
});

client.login(process.env.TOKEN);
