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

const express = require('express');
require('dotenv').config();

// ============================================================
// EXPRESS SERVER
// ============================================================

const app = express();

app.get('/', (req, res) => {
    res.send('3RB Voice Bot is active and running!');
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🌍 Server is listening on port ${PORT}`);
});

// ============================================================
// DISCORD CLIENT
// ============================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ============================================================
// CONFIG
// ============================================================

const CREATOR_CHANNEL_ID = process.env.CREATOR_CHANNEL_ID;

// userId -> channelId
const ownedChannels = new Map();

// ============================================================
// HELPERS
// ============================================================

function findChannelOwner(channelId) {
    for (const [userId, ownedChannelId] of ownedChannels.entries()) {
        if (ownedChannelId === channelId) {
            return userId;
        }
    }

    return null;
}

function isChannelOwner(userId, channelId) {
    return ownedChannels.get(userId) === channelId;
}

function getOwnedChannel(interaction) {
    const channelId = ownedChannels.get(interaction.user.id);

    if (!channelId) {
        return null;
    }

    return interaction.guild.channels.cache.get(channelId) || null;
}

function getMemberVoiceChannel(interaction) {
    return interaction.member?.voice?.channel || null;
}

function errorReply(interaction, message) {
    if (interaction.replied || interaction.deferred) {
        return interaction.followUp({
            content: message,
            ephemeral: true
        }).catch(() => {});
    }

    return interaction.reply({
        content: message,
        ephemeral: true
    }).catch(() => {});
}

// ============================================================
// READY
// ============================================================

client.once('ready', () => {
    console.log(`✅ تم تسجيل الدخول بنجاح باسم: ${client.user.tag}`);
    console.log(`🎙️ Temporary Voice System: ONLINE`);
});

// ============================================================
// SETUP PANEL
// ============================================================

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (message.content !== '!setup') return;

    const isOwner = message.guild.ownerId === message.author.id;

    const isAdmin =
        message.member &&
        message.member.permissions.has(
            PermissionsBitField.Flags.Administrator
        );

    if (!isOwner && !isAdmin) {
        return message.reply({
            content: '❌ هذا الأمر مخصص لمالك السيرفر والإدارة فقط!'
        });
    }

    try {

        // ========================================================
        // MAIN EMBED
        // ========================================================

        const embed = new EmbedBuilder()
            .setColor('#D4AF37')
            .setAuthor({
                name: `👑 ${message.guild.name} 👑`,
                iconURL:
                    message.guild.iconURL({ dynamic: true }) ||
                    undefined
            })
            .setTitle('⚔️  𝐋𝐎𝐘𝐀𝐋 𝐕𝐎𝐈𝐂𝐄 • لوحة التحكم الملكية  ⚔️')
            .setDescription(
                [
                    '`━━━━━━━━━━━━━━━━━━━━━━━━━━`',
                    '',
                    '### ✨ 👑 مملكتك الصوتية بين يديك 👑 ✨',
                    '> *من هنا تتحكم في روحك الصوتي بكامل القوة والفخامة* 🔥',
                    '> 💎 *تجربة ملكية بلا حدود — كل ما تحتاجه بضغطة واحدة* 💎',
                    '',
                    '`━━━━━━━━━━━━━━━━━━━━━━━━━━`',
                    '',
                    '`✒️\u00A0تغيير\u00A0الاسم` `👥\u00A0حد\u00A0الأعضاء` `🔐\u00A0الخصوصية` `📜\u00A0حالة\u00A0الروم`',
                    '`📖\u00A0معلومات` `💎\u00A0الثقة` `🚫\u00A0سحب\u00A0الثقة` `💌\u00A0دعوة`',
                    '`🚪\u00A0طلب\u00A0انضمام` `🔕\u00A0وضع\u00A0الاجتماع` `🥾\u00A0طرد` `⛔\u00A0حظر`',
                    '`🕊️\u00A0رفع\u00A0الحظر` `👑\u00A0أخذ\u00A0الملكية` `🔁\u00A0نقل\u00A0الملكية` `⏳\u00A0غرفة\u00A0الانتظار`',
                    '`🌍\u00A0تغيير\u00A0المنطقة` `🎨\u00A0لون\u00A0الحاوية` `📊\u00A0داشبورد` `🗑️\u00A0حذف\u00A0الروم`',
                    '',
                    '`━━━━━━━━━━━━━━━━━━━━━━━━━━`'
                ].join('\n')
            )
            .setThumbnail(
                message.guild.iconURL({ dynamic: true }) || null
            )
            .setFooter({
                text: `⚔️ ${message.guild.name} ⚔️ • Voice Management Dashboard`,
                iconURL:
                    message.guild.iconURL({ dynamic: true }) ||
                    undefined
            })
            .setTimestamp();

        // ========================================================
        // ROW 1 — BASIC
        // 4 BUTTONS
        // ========================================================

        const row1 = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId('t_rename')
                .setEmoji('✒️')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('t_limit')
                .setEmoji('👥')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('t_lock')
                .setEmoji('🔐')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('t_status')
                .setEmoji('📜')
                .setStyle(ButtonStyle.Secondary)
        );

        // ========================================================
        // ROW 2 — INFORMATION / MEMBERS
        // 4 BUTTONS
        // ========================================================

        const row2 = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId('t_info')
                .setEmoji('📖')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('t_trust')
                .setEmoji('💎')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('t_untrust')
                .setEmoji('🚫')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('t_invite')
                .setEmoji('💌')
                .setStyle(ButtonStyle.Primary)
        );

        // ========================================================
        // ROW 3 — MEMBERS / MODERATION
        // 4 BUTTONS
        // ========================================================

        const row3 = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId('t_request')
                .setEmoji('🚪')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('t_meeting')
                .setEmoji('🔕')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('t_kick')
                .setEmoji('🥾')
                .setStyle(ButtonStyle.Danger),

            new ButtonBuilder()
                .setCustomId('t_ban')
                .setEmoji('⛔')
                .setStyle(ButtonStyle.Danger)
        );

        // ========================================================
        // ROW 4 — OWNERSHIP / PROTECTION
        // 4 BUTTONS
        // ========================================================

        const row4 = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId('t_unban')
                .setEmoji('🕊️')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId('t_claim')
                .setEmoji('👑')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('t_owner')
                .setEmoji('🔁')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('t_bitrate')
                .setEmoji('⏳')
                .setStyle(ButtonStyle.Secondary)
        );

        // ========================================================
        // ROW 5 — ADVANCED
        // 4 BUTTONS
        // ========================================================

        const row5 = new ActionRowBuilder().addComponents(

            new ButtonBuilder()
                .setCustomId('t_region')
                .setEmoji('🌍')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('t_color')
                .setEmoji('🎨')
                .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()
                .setCustomId('t_dashboard')
                .setEmoji('📊')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('t_delete')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger)
        );

        // ========================================================
        // SEND PANEL
        // 5 ROWS × 4 BUTTONS = 20 BUTTONS
        // ========================================================

        await message.channel.send({
            embeds: [embed],
            components: [
                row1,
                row2,
                row3,
                row4,
                row5
            ]
        });

        await message.delete().catch(() => {});

    } catch (error) {

        console.error(
            '❌ Error sending setup panel:',
            error
        );

        await message.reply({
            content:
                '❌ حدث خطأ أثناء إنشاء لوحة التحكم.'
        }).catch(() => {});
    }
});

// ============================================================
// BUTTON INTERACTIONS
// ============================================================

client.on('interactionCreate', async interaction => {

    if (!interaction.isButton()) return;

    // أزرار طلب الانضمام لها نظام مختلف
    if (
        interaction.customId.startsWith('request_accept_') ||
        interaction.customId.startsWith('request_deny_')
    ) {

        try {

            const parts =
                interaction.customId.split('_');

            const type = parts[1];
            const targetId = parts[2];
            const channelId = parts[3];

            const ownerId =
                findChannelOwner(channelId);

            if (ownerId !== interaction.user.id) {
                return interaction.reply({
                    content:
                        '❌ فقط مالك الغرفة يستطيع التعامل مع هذا الطلب.',
                    ephemeral: true
                });
            }

            if (!interaction.guild) {
                return interaction.reply({
                    content:
                        '❌ لا يمكن معالجة الطلب من خارج السيرفر.',
                    ephemeral: true
                });
            }

            const channel =
                interaction.guild.channels.cache.get(
                    channelId
                );

            if (!channel) {
                return interaction.reply({
                    content:
                        '❌ الغرفة لم تعد موجودة.',
                    ephemeral: true
                });
            }

            if (type === 'accept') {

                await channel.permissionOverwrites.edit(
                    targetId,
                    {
                        Connect: true,
                        Speak: true
                    }
                );

                return interaction.update({
                    content:
                        '✅ تم السماح للعضو بدخول الغرفة.',
                    embeds: [],
                    components: []
                });
            }

            return interaction.update({
                content:
                    '❌ تم رفض طلب الانضمام.',
                embeds: [],
                components: []
            });

        } catch (error) {

            console.error(
                '❌ Request Button Error:',
                error
            );

            return errorReply(
                interaction,
                '❌ حدث خطأ أثناء معالجة الطلب.'
            );
        }
    }

    if (!interaction.customId.startsWith('t_')) return;

    const action =
        interaction.customId.replace('t_', '');

    try {

        // ========================================================
        // CLAIM
        // ========================================================

        if (action === 'claim') {

            const memberChannel =
                getMemberVoiceChannel(interaction);

            if (!memberChannel) {
                return interaction.reply({
                    content:
                        '❌ يجب أن تكون داخل روم صوتي للمطالبة به.',
                    ephemeral: true
                });
            }

            if (
                memberChannel.id ===
                CREATOR_CHANNEL_ID
            ) {
                return interaction.reply({
                    content:
                        '❌ لا يمكنك المطالبة بغرفة الإنشاء.',
                    ephemeral: true
                });
            }

            const existingOwner =
                findChannelOwner(memberChannel.id);

            if (existingOwner) {

                const ownerMember =
                    await interaction.guild.members
                        .fetch(existingOwner)
                        .catch(() => null);

                if (
                    ownerMember &&
                    ownerMember.voice.channelId ===
                    memberChannel.id
                ) {
                    return interaction.reply({
                        content:
                            '❌ مالك الروم الحالي موجود بداخله ولا يمكنك أخذ الملكية.',
                        ephemeral: true
                    });
                }
            }

            ownedChannels.set(
                interaction.user.id,
                memberChannel.id
            );

            await memberChannel.permissionOverwrites.edit(
                interaction.user.id,
                {
                    ManageChannels: true,
                    MuteMembers: true,
                    DeafenMembers: true,
                    MoveMembers: true,
                    Connect: true,
                    Speak: true
                }
            ).catch(() => {});

            return interaction.reply({
                content:
                    `👑 أصبحت مالك روم **${memberChannel.name}** بنجاح!`,
                ephemeral: true
            });
        }

        // ========================================================
        // REQUEST JOIN
        // ========================================================

        if (action === 'request') {

            const memberChannel =
                getMemberVoiceChannel(interaction);

            if (!memberChannel) {
                return interaction.reply({
                    content:
                        '❌ يجب أن تكون داخل روم صوتي أو متصل بروم لإرسال طلب.',
                    ephemeral: true
                });
            }

            const ownerId =
                findChannelOwner(memberChannel.id);

            if (!ownerId) {
                return interaction.reply({
                    content:
                        '❌ لم يتم العثور على مالك لهذه الغرفة.',
                    ephemeral: true
                });
            }

            if (
                ownerId === interaction.user.id
            ) {
                return interaction.reply({
                    content:
                        '❌ أنت مالك الغرفة بالفعل.',
                    ephemeral: true
                });
            }

            const ownerMember =
                await interaction.guild.members
                    .fetch(ownerId)
                    .catch(() => null);

            if (!ownerMember) {
                return interaction.reply({
                    content:
                        '❌ تعذر العثور على مالك الغرفة.',
                    ephemeral: true
                });
            }

            const requestEmbed =
                new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle('🚪 طلب انضمام جديد')
                    .setDescription(
                        `العضو **${interaction.user.tag}** يريد الانضمام إلى غرفتك الصوتية.`
                    )
                    .addFields(
                        {
                            name: '👤 العضو',
                            value:
                                `<@${interaction.user.id}>`,
                            inline: true
                        },
                        {
                            name: '🎙️ الغرفة',
                            value:
                                memberChannel.name,
                            inline: true
                        }
                    )
                    .setFooter({
                        text:
                            interaction.guild.name
                    })
                    .setTimestamp();

            const requestRow =
                new ActionRowBuilder()
                    .addComponents(

                        new ButtonBuilder()
                            .setCustomId(
                                `request_accept_${interaction.user.id}_${memberChannel.id}`
                            )
                            .setEmoji('✅')
                            .setStyle(
                                ButtonStyle.Success
                            ),

                        new ButtonBuilder()
                            .setCustomId(
                                `request_deny_${interaction.user.id}_${memberChannel.id}`
                            )
                            .setEmoji('❌')
                            .setStyle(
                                ButtonStyle.Danger
                            )
                    );

            try {

                await ownerMember.send({
                    embeds: [requestEmbed],
                    components: [requestRow]
                });

                return interaction.reply({
                    content:
                        `📨 تم إرسال طلبك إلى مالك الغرفة **${ownerMember.user.tag}**.`,
                    ephemeral: true
                });

            } catch {

                return interaction.reply({
                    content:
                        '❌ تعذر إرسال الطلب. قد تكون الرسائل الخاصة بالمالك مغلقة.',
                    ephemeral: true
                });
            }
        }

        // ========================================================
        // NORMAL OWNER ACTIONS
        // ========================================================

        const channel =
            getOwnedChannel(interaction);

        if (!channel) {

            ownedChannels.delete(
                interaction.user.id
            );

            return interaction.reply({
                content:
                    '❌ لا تملك روم صوتي مؤقتاً نشطاً.',
                ephemeral: true
            });
        }

        // ========================================================
        // RENAME
        // ========================================================

        if (action === 'rename') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_rename'
                    )
                    .setTitle(
                        'تغيير اسم الغرفة الصوتية'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'newName'
                    )
                    .setLabel(
                        'اكتب الاسم الجديد للروم'
                    )
                    .setPlaceholder(
                        'مثال: 🔊 Gaming Room'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setMaxLength(30)
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // LIMIT
        // ========================================================

        if (action === 'limit') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_limit'
                    )
                    .setTitle(
                        'تحديد حد الأعضاء'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'newLimit'
                    )
                    .setLabel(
                        'العدد من 0 إلى 99'
                    )
                    .setPlaceholder(
                        'مثال: 10'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setMaxLength(2)
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // LOCK
        // ========================================================

        if (action === 'lock') {

            const everyoneOverwrite =
                channel.permissionOverwrites.cache.get(
                    interaction.guild.id
                );

            const isLocked =
                everyoneOverwrite?.deny.has(
                    PermissionsBitField.Flags.Connect
                );

            await channel.permissionOverwrites.edit(
                interaction.guild.id,
                {
                    Connect:
                        isLocked
                            ? null
                            : false
                }
            );

            return interaction.reply({
                content:
                    isLocked
                        ? '🔓 تم فتح الغرفة ويمكن للأعضاء دخولها.'
                        : '🔒 تم قفل الغرفة ومنع دخول الأعضاء.',
                ephemeral: true
            });
        }

        // ========================================================
        // WAITING ROOM
        // ========================================================

        if (action === 'bitrate') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_waiting'
                    )
                    .setTitle(
                        'إعدادات غرفة الانتظار'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'waitMsg'
                    )
                    .setLabel(
                        'رسالة حالة الانتظار'
                    )
                    .setPlaceholder(
                        'مثال: ⏳ الغرفة خاصة حالياً'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setMaxLength(50)
                    .setRequired(false);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // STATUS
        // ========================================================

        if (action === 'status') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_status'
                    )
                    .setTitle(
                        'تغيير حالة الروم'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'newStatus'
                    )
                    .setLabel(
                        'الحالة أو الوصف'
                    )
                    .setPlaceholder(
                        'مثال: 🎮 Ranked Only'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setMaxLength(50)
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // TRUST
        // ========================================================

        if (action === 'trust') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_trust'
                    )
                    .setTitle(
                        'إعطاء الثقة'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'targetUser'
                    )
                    .setLabel(
                        'User ID'
                    )
                    .setPlaceholder(
                        '123456789012345678'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // UNTRUST
        // ========================================================

        if (action === 'untrust') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_untrust'
                    )
                    .setTitle(
                        'سحب الثقة'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'targetUser'
                    )
                    .setLabel(
                        'User ID'
                    )
                    .setPlaceholder(
                        '123456789012345678'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // INVITE
        // ========================================================

        if (action === 'invite') {

            const invite =
                await channel
                    .createInvite({
                        maxUses: 1,
                        unique: true,
                        reason:
                            `Temporary room invite by ${interaction.user.tag}`
                    })
                    .catch(() => null);

            if (!invite) {
                return interaction.reply({
                    content:
                        '❌ تعذر إنشاء دعوة للغرفة.',
                    ephemeral: true
                });
            }

            return interaction.reply({
                content:
                    `📨 **رابط الدعوة:**\nhttps://discord.gg/${invite.code}`,
                ephemeral: true
            });
        }

        // ========================================================
        // KICK
        // ========================================================

        if (action === 'kick') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_kick'
                    )
                    .setTitle(
                        'طرد عضو'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'targetUser'
                    )
                    .setLabel(
                        'User ID'
                    )
                    .setPlaceholder(
                        '123456789012345678'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // REGION
        // ========================================================

        if (action === 'region') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_region'
                    )
                    .setTitle(
                        'تغيير منطقة الصوت'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'newRegion'
                    )
                    .setLabel(
                        'أدخل المنطقة أو اكتب auto'
                    )
                    .setPlaceholder(
                        'auto / us-east / us-west / europe / singapore'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // BAN
        // ========================================================

        if (action === 'ban') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_ban'
                    )
                    .setTitle(
                        'حظر عضو من الغرفة'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'targetUser'
                    )
                    .setLabel(
                        'User ID'
                    )
                    .setPlaceholder(
                        '123456789012345678'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // UNBAN
        // ========================================================

        if (action === 'unban') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_unban'
                    )
                    .setTitle(
                        'رفع الحظر'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'targetUser'
                    )
                    .setLabel(
                        'User ID'
                    )
                    .setPlaceholder(
                        '123456789012345678'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // OWNER TRANSFER
        // ========================================================

        if (action === 'owner') {

            const modal =
                new ModalBuilder()
                    .setCustomId(
                        'modal_owner'
                    )
                    .setTitle(
                        'نقل ملكية الغرفة'
                    );

            const input =
                new TextInputBuilder()
                    .setCustomId(
                        'targetUser'
                    )
                    .setLabel(
                        'User ID للمالك الجديد'
                    )
                    .setPlaceholder(
                        '123456789012345678'
                    )
                    .setStyle(
                        TextInputStyle.Short
                    )
                    .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder()
                    .addComponents(input)
            );

            return interaction.showModal(
                modal
            );
        }

        // ========================================================
        // DELETE
        // ========================================================

        if (action === 'delete') {

            const channelId =
                channel.id;

            ownedChannels.delete(
                interaction.user.id
            );

            await interaction.reply({
                content:
                    '🗑️ سيتم حذف الغرفة...',
                ephemeral: true
            });

            await channel.delete(
                'Temporary voice room deleted by owner'
            ).catch(() => {});

            return;
        }

        // ========================================================
        // COLOR
        // ========================================================

        if (action === 'color') {

            return interaction.reply({
                content:
                    '🎨 Discord لا يدعم تغيير لون قناة الصوت نفسها. يمكن تنفيذ نظام ألوان عبر أسماء/رموز الغرف أو الرتب إذا أردت.',
                ephemeral: true
            });
        }

        // ========================================================
        // MEETING
        // ========================================================

        if (action === 'meeting') {

            const everyoneOverwrite =
                channel.permissionOverwrites.cache.get(
                    interaction.guild.id
                );

            const isMeeting =
                everyoneOverwrite?.deny.has(
                    PermissionsBitField.Flags.Speak
                );

            if (isMeeting) {

                await channel.permissionOverwrites.edit(
                    interaction.guild.id,
                    {
                        Speak: null
                    }
                );

                await channel.permissionOverwrites.edit(
                    interaction.user.id,
                    {
                        Speak: true
                    }
                );

                return interaction.reply({
                    content:
                        '🔊 تم إلغاء وضع الاجتماع. أصبح التحدث متاحاً.',
                    ephemeral: true
                });
            }

            await channel.permissionOverwrites.edit(
                interaction.guild.id,
                {
                    Speak: false
                }
            );

            await channel.permissionOverwrites.edit(
                interaction.user.id,
                {
                    Speak: true
                }
            );

            return interaction.reply({
                content:
                    '🔇 تم تفعيل وضع الاجتماع. المالك فقط يستطيع التحدث.',
                ephemeral: true
            });
        }

        // ========================================================
        // INFO
        // ========================================================

        if (action === 'info') {

            const ownerId =
                findChannelOwner(channel.id);

            const owner =
                ownerId
                    ? `<@${ownerId}>`
                    : 'غير معروف';

            const region =
                channel.rtcRegion ||
                'تلقائي';

            const limit =
                channel.userLimit ||
                'بلا حدود';

            const members =
                channel.members.size;

            const locked =
                channel.permissionOverwrites
                    .get(interaction.guild.id)
                    ?.deny.has(
                        PermissionsBitField.Flags.Connect
                    )
                    ? '🔒 مقفلة'
                    : '🔓 مفتوحة';

            const embed =
                new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle(
                        '📖 معلومات الغرفة الملكية'
                    )
                    .addFields(
                        {
                            name:
                                '👑 المالك',
                            value:
                                owner,
                            inline: true
                        },
                        {
                            name:
                                '🎙️ اسم الغرفة',
                            value:
                                channel.name,
                            inline: true
                        },
                        {
                            name:
                                '👥 الأعضاء',
                            value:
                                `${members}`,
                            inline: true
                        },
                        {
                            name:
                                '🔢 الحد',
                            value:
                                `${limit}`,
                            inline: true
                        },
                        {
                            name:
                                '🔒 الخصوصية',
                            value:
                                locked,
                            inline: true
                        },
                        {
                            name:
                                '🌐 المنطقة',
                            value:
                                region,
                            inline: true
                        }
                    )
                    .setFooter({
                        text:
                            interaction.guild.name
                    })
                    .setTimestamp();

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }

        // ========================================================
        // DASHBOARD
        // ========================================================

        if (action === 'dashboard') {

            const ownerId =
                findChannelOwner(channel.id);

            const embed =
                new EmbedBuilder()
                    .setColor('#D4AF37')
                    .setTitle(
                        '📊 داشبورد الغرفة الملكية'
                    )
                    .setDescription(
                        [
                            `🎙️ **الغرفة:** ${channel.name}`,
                            `👑 **المالك:** <@${ownerId}>`,
                            `👥 **الأعضاء:** ${channel.members.size}`,
                            `🔢 **الحد:** ${channel.userLimit || 'بلا حدود'}`,
                            `🌐 **المنطقة:** ${channel.rtcRegion || 'تلقائي'}`,
                            '',
                            '🟢 **حالة النظام:** يعمل',
                            '🎛️ **نظام الغرفة:** مؤقتة',
                            '🛡️ **نظام الملكية:** مفعل'
                        ].join('\n')
                    )
                    .setFooter({
                        text:
                            `${interaction.guild.name} • Dashboard`
                    })
                    .setTimestamp();

            return interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
        }

    } catch (error) {

        console.error(
            `❌ Button Error [${interaction.customId}]:`,
            error
        );

        return errorReply(
            interaction,
            '❌ حدث خطأ أثناء تنفيذ العملية. تأكد من صلاحيات البوت.'
        );
    }
});

// ============================================================
// MODAL INTERACTIONS
// ============================================================

client.on('interactionCreate', async interaction => {

    if (!interaction.isModalSubmit()) return;

    try {

        const userId =
            interaction.user.id;

        const channelId =
            ownedChannels.get(userId);

        if (!channelId) {
            return interaction.reply({
                content:
                    '❌ لا تملك روم نشطاً.',
                ephemeral: true
            });
        }

        const channel =
            interaction.guild.channels.cache.get(
                channelId
            );

        if (!channel) {

            ownedChannels.delete(userId);

            return interaction.reply({
                content:
                    '❌ الروم غير موجود.',
                ephemeral: true
            });
        }

        // ========================================================
        // RENAME
        // ========================================================

        if (
            interaction.customId ===
            'modal_rename'
        ) {

            const newName =
                interaction.fields
                    .getTextInputValue(
                        'newName'
                    )
                    .trim();

            if (!newName) {
                return interaction.reply({
                    content:
                        '❌ اسم الروم لا يمكن أن يكون فارغاً.',
                    ephemeral: true
                });
            }

            await channel.setName(
                newName
            );

            return interaction.reply({
                content:
                    `✅ تم تغيير اسم الروم إلى **${newName}**`,
                ephemeral: true
            });
        }

        // ========================================================
        // LIMIT
        // ========================================================

        if (
            interaction.customId ===
            'modal_limit'
        ) {

            const value =
                interaction.fields
                    .getTextInputValue(
                        'newLimit'
                    )
                    .trim();

            const limit =
                Number.parseInt(
                    value,
                    10
                );

            if (
                Number.isNaN(limit) ||
                limit < 0 ||
                limit > 99
            ) {
                return interaction.reply({
                    content:
                        '❌ أدخل رقماً صحيحاً من 0 إلى 99.',
                    ephemeral: true
                });
            }

            await channel.setUserLimit(
                limit
            );

            return interaction.reply({
                content:
                    `✅ تم تحديد الحد الأقصى إلى **${limit}** عضو.`,
                ephemeral: true
            });
        }

        // ========================================================
        // WAITING
        // ========================================================

        if (
            interaction.customId ===
            'modal_waiting'
        ) {

            const message =
                interaction.fields
                    .getTextInputValue(
                        'waitMsg'
                    )
                    .trim();

            if (!message) {

                await channel.setName(
                    `⏳ | ${channel.name.replace(
                        /^⏳ \| /,
                        ''
                    )}`
                );

                return interaction.reply({
                    content:
                        '⏳ تم تفعيل علامة غرفة الانتظار.',
                    ephemeral: true
                });
            }

            await channel.setName(
                `⏳ | ${message}`.slice(
                    0,
                    100
                )
            );

            return interaction.reply({
                content:
                    `⏳ تم تحديث غرفة الانتظار إلى: **${message}**`,
                ephemeral: true
            });
        }

        // ========================================================
        // STATUS
        // ========================================================

        if (
            interaction.customId ===
            'modal_status'
        ) {

            const status =
                interaction.fields
                    .getTextInputValue(
                        'newStatus'
                    )
                    .trim();

            await channel
                .setTopic(status)
                .catch(() => {});

            return interaction.reply({
                content:
                    `💬 تم تحديث حالة الغرفة إلى:\n**${status}**`,
                ephemeral: true
            });
        }

        // ========================================================
        // TRUST
        // ========================================================

        if (
            interaction.customId ===
            'modal_trust'
        ) {

            const targetId =
                interaction.fields
                    .getTextInputValue(
                        'targetUser'
                    )
                    .trim();

            const targetMember =
                await interaction.guild.members
                    .fetch(targetId)
                    .catch(() => null);

            if (!targetMember) {
                return interaction.reply({
                    content:
                        '❌ لم يتم العثور على العضو.',
                    ephemeral: true
                });
            }

            await channel.permissionOverwrites.edit(
                targetId,
                {
                    Connect: true,
                    Speak: true
                }
            );

            return interaction.reply({
                content:
                    `🟢 تم إعطاء الثقة للعضو **${targetMember.user.tag}**.`,
                ephemeral: true
            });
        }

        // ========================================================
        // UNTRUST
        // ========================================================

        if (
            interaction.customId ===
            'modal_untrust'
        ) {

            const targetId =
                interaction.fields
                    .getTextInputValue(
                        'targetUser'
                    )
                    .trim();

            const targetMember =
                await interaction.guild.members
                    .fetch(targetId)
                    .catch(() => null);

            if (!targetMember) {
                return interaction.reply({
                    content:
                        '❌ لم يتم العثور على العضو.',
                    ephemeral: true
                });
            }

            await channel.permissionOverwrites
                .delete(targetId)
                .catch(() => {});

            return interaction.reply({
                content:
                    `👤 تم سحب الثقة من **${targetMember.user.tag}**.`,
                ephemeral: true
            });
        }

        // ========================================================
        // KICK
        // ========================================================

        if (
            interaction.customId ===
            'modal_kick'
        ) {

            const targetId =
                interaction.fields
                    .getTextInputValue(
                        'targetUser'
                    )
                    .trim();

            const targetMember =
                await interaction.guild.members
                    .fetch(targetId)
                    .catch(() => null);

            if (
                !targetMember ||
                !targetMember.voice.channel ||
                targetMember.voice.channel.id !==
                channel.id
            ) {
                return interaction.reply({
                    content:
                        '❌ العضو غير موجود داخل غرفتك.',
                    ephemeral: true
                });
            }

            if (
                targetId ===
                interaction.user.id
            ) {
                return interaction.reply({
                    content:
                        '❌ لا يمكنك طرد نفسك.',
                    ephemeral: true
                });
            }

            await targetMember.voice
                .disconnect();

            return interaction.reply({
                content:
                    `⚡ تم طرد **${targetMember.user.tag}**.`,
                ephemeral: true
            });
        }

        // ========================================================
        // BAN
        // ========================================================

        if (
            interaction.customId ===
            'modal_ban'
        ) {

            const targetId =
                interaction.fields
                    .getTextInputValue(
                        'targetUser'
                    )
                    .trim();

            if (
                targetId ===
                interaction.user.id
            ) {
                return interaction.reply({
                    content:
                        '❌ لا يمكنك حظر نفسك.',
                    ephemeral: true
                });
            }

            const targetMember =
                await interaction.guild.members
                    .fetch(targetId)
                    .catch(() => null);

            if (!targetMember) {
                return interaction.reply({
                    content:
                        '❌ لم يتم العثور على العضو.',
                    ephemeral: true
                });
            }

            if (
                targetMember.voice.channel &&
                targetMember.voice.channel.id ===
                channel.id
            ) {
                await targetMember.voice
                    .disconnect()
                    .catch(() => {});
            }

            await channel.permissionOverwrites.edit(
                targetId,
                {
                    Connect: false,
                    Speak: false
                }
            );

            return interaction.reply({
                content:
                    `⛔ تم حظر **${targetMember.user.tag}** من الغرفة.`,
                ephemeral: true
            });
        }

        // ========================================================
        // UNBAN
        // ========================================================

        if (
            interaction.customId ===
            'modal_unban'
        ) {

            const targetId =
                interaction.fields
                    .getTextInputValue(
                        'targetUser'
                    )
                    .trim();

            await channel.permissionOverwrites
                .delete(targetId)
                .catch(() => {});

            return interaction.reply({
                content:
                    '✅ تم رفع الحظر عن العضو.',
                ephemeral: true
            });
        }

        // ========================================================
        // REGION
        // ========================================================

        if (
            interaction.customId ===
            'modal_region'
        ) {

            const region =
                interaction.fields
                    .getTextInputValue(
                        'newRegion'
                    )
                    .trim()
                    .toLowerCase();

            const allowedRegions = [
                'auto',
                'us-east',
                'us-west',
                'us-central',
                'us-south',
                'us',
                'brazil',
                'singapore',
                'japan',
                'hongkong',
                'india',
                'dubai',
                'south-korea',
                'southafrica',
                'sydney',
                'europe',
                'rotterdam',
                'russia'
            ];

            if (
                !allowedRegions.includes(
                    region
                )
            ) {
                return interaction.reply({
                    content:
                        `❌ المنطقة غير صحيحة.\n\nالمناطق المتاحة:\n\`${allowedRegions.join(
                            '` • `'
                        )}\``,
                    ephemeral: true
                });
            }

            await channel.setRTCRegion(
                region === 'auto'
                    ? null
                    : region
            );

            return interaction.reply({
                content:
                    region === 'auto'
                        ? '🌐 تم ضبط منطقة الصوت على تلقائي.'
                        : `🌐 تم تغيير منطقة الصوت إلى **${region}**.`,
                ephemeral: true
            });
        }

        // ========================================================
        // OWNER TRANSFER
        // ========================================================

        if (
            interaction.customId ===
            'modal_owner'
        ) {

            const targetId =
                interaction.fields
                    .getTextInputValue(
                        'targetUser'
                    )
                    .trim();

            if (
                targetId ===
                interaction.user.id
            ) {
                return interaction.reply({
                    content:
                        '❌ أنت مالك الروم بالفعل.',
                    ephemeral: true
                });
            }

            const targetMember =
                await interaction.guild.members
                    .fetch(targetId)
                    .catch(() => null);

            if (!targetMember) {
                return interaction.reply({
                    content:
                        '❌ لم يتم العثور على العضو.',
                    ephemeral: true
                });
            }

            const oldOwnerId =
                interaction.user.id;

            await channel.permissionOverwrites
                .delete(oldOwnerId)
                .catch(() => {});

            await channel.permissionOverwrites.edit(
                targetId,
                {
                    ManageChannels: true,
                    MuteMembers: true,
                    DeafenMembers: true,
                    MoveMembers: true,
                    Connect: true,
                    Speak: true
                }
            );

            ownedChannels.delete(
                oldOwnerId
            );

            ownedChannels.set(
                targetId,
                channel.id
            );

            return interaction.reply({
                content:
                    `🔄 تم نقل ملكية الغرفة إلى **${targetMember.user.tag}** بنجاح.`,
                ephemeral: true
            });
        }

    } catch (error) {

        console.error(
            `❌ Modal Error [${interaction.customId}]:`,
            error
        );

        return errorReply(
            interaction,
            '❌ حدث خطأ أثناء تنفيذ العملية. تأكد من صلاحيات البوت.'
        );
    }
});

// ============================================================
// TEMPORARY VOICE CHANNEL SYSTEM
// ============================================================

client.on(
    'voiceStateUpdate',
    async (oldState, newState) => {

        const member =
            newState.member;

        const guild =
            newState.guild;

        // ========================================================
        // CREATE TEMPORARY ROOM
        // ========================================================

        if (
            newState.channelId ===
            CREATOR_CHANNEL_ID
        ) {

            try {

                const creatorChannel =
                    newState.channel;

                if (!creatorChannel) return;

                const voiceChannel =
                    await guild.channels.create({
                        name:
                            `🔊 | ${member.user.username}`.slice(
                                0,
                                100
                            ),

                        type:
                            ChannelType.GuildVoice,

                        parent:
                            creatorChannel.parentId ||
                            null,

                        permissionOverwrites: [
                            {
                                id:
                                    guild.id,

                                allow: [
                                    PermissionsBitField.Flags.Connect,
                                    PermissionsBitField.Flags.Speak
                                ]
                            },

                            {
                                id:
                                    member.id,

                                allow: [
                                    PermissionsBitField.Flags.ManageChannels,
                                    PermissionsBitField.Flags.MuteMembers,
                                    PermissionsBitField.Flags.DeafenMembers,
                                    PermissionsBitField.Flags.MoveMembers,
                                    PermissionsBitField.Flags.Connect,
                                    PermissionsBitField.Flags.Speak
                                ]
                            }
                        ]
                    });

                // حفظ الملكية
                ownedChannels.set(
                    member.id,
                    voiceChannel.id
                );

                // نقل العضو
                await member.voice
                    .setChannel(
                        voiceChannel
                    )
                    .catch(() => {});

                console.log(
                    `🎙️ Created temporary room: ${voiceChannel.name} | Owner: ${member.user.tag}`
                );

            } catch (error) {

                console.error(
                    '❌ خطأ أثناء إنشاء الروم المؤقت:',
                    error
                );
            }
        }

        // ========================================================
        // DELETE EMPTY TEMPORARY ROOM
        // ========================================================

        if (
            oldState.channel &&
            oldState.channel.id !==
            CREATOR_CHANNEL_ID
        ) {

            const oldChannel =
                oldState.channel;

            if (
                oldChannel.type ===
                    ChannelType.GuildVoice &&
                oldChannel.members.size === 0
            ) {

                const ownerId =
                    findChannelOwner(
                        oldChannel.id
                    );

                if (ownerId) {
                    ownedChannels.delete(
                        ownerId
                    );
                }

                await oldChannel
                    .delete(
                        'Temporary voice room became empty'
                    )
                    .catch(() => {});

                console.log(
                    `🗑️ Deleted empty temporary room: ${oldChannel.name}`
                );
            }
        }
    }
);

// ============================================================
// LOGIN
// ============================================================

client.login(
    process.env.TOKEN
);
