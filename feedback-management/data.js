/*
 * 演示数据：以下用户、反馈、邮箱、邮件往来与发送结果均为匿名合成。
 * support-demo@gmail.com 仅用于界面演示，并非已授权或可用的收发邮箱。
 * 本原型不连接真实邮箱，不向任何地址发送邮件。
 */
(function () {
  'use strict';

  const settings = {
    enabled: true,
    subject: 'We’ve received your feedback · #{feedback_id}',
    body: 'Hi,\n\nThank you for reaching out. We’ve received your feedback, and our support team will review it and get back to you as soon as possible.\n\nReference: #{feedback_id}\n\nThank you for your patience.\nCustomer Support Team',
    senderName: 'Customer Support',
    mailbox: 'support-demo@gmail.com',
    connected: true,
    syncEnabled: true,
    syncAt: '2026-11-12 10:32:08',
    syncScope: 'support',
    history: false
  };

  const message = (kind, via, at, text, delivery = null) => ({
    kind, via, at, text, delivery, attachment: null
  });
  const receipt = (id, at, delivery = 'sent') => message(
    'auto', 'email', at,
    settings.body.replaceAll('#{feedback_id}', String(id)),
    delivery
  );

  const records = [
    {
      id: 89,
      source: 'h5',
      userId: 'U100268',
      email: 'avery@example.com',
      name: 'Avery',
      type: '充值问题',
      content: 'I completed my payment, but the next episodes are still locked. Could you please check my purchase?',
      subject: 'Payment completed, but episodes are still locked',
      status: 'pending',
      ack: 'sent',
      ackReason: '',
      ackAt: '2026-11-12 10:30:24',
      createdAt: '2026-11-12 10:30:22',
      updatedAt: '2026-11-12 10:30:24',
      latestReply: '',
      messages: [
        message('user', 'h5', '2026-11-12 10:30:22', 'I completed my payment, but the next episodes are still locked. Could you please check my purchase?'),
        receipt(89, '2026-11-12 10:30:24')
      ]
    },
    {
      id: 88,
      source: 'email',
      userId: null,
      email: 'morgan@example.net',
      name: 'Morgan',
      type: '其他',
      content: 'Please cancel the automatic renewal for my subscription. I would like to keep access until the end of the current period.',
      subject: 'Please cancel my subscription renewal',
      status: 'pending',
      ack: 'sent',
      ackReason: '',
      ackAt: '2026-11-12 10:27:14',
      createdAt: '2026-11-12 10:27:11',
      updatedAt: '2026-11-12 10:27:14',
      latestReply: '',
      messages: [
        message('user', 'email', '2026-11-12 10:27:11', 'Please cancel the automatic renewal for my subscription. I would like to keep access until the end of the current period.'),
        receipt(88, '2026-11-12 10:27:14')
      ]
    },
    {
      id: 87,
      source: 'email',
      userId: null,
      email: 'jordan@example.com',
      name: 'Jordan',
      type: '充值问题',
      content: 'My payment went through, but my coin balance has not changed.',
      subject: 'Coins missing after payment',
      status: 'processing',
      ack: 'sent',
      ackReason: '',
      ackAt: '2026-11-12 09:16:46',
      createdAt: '2026-11-12 09:16:43',
      updatedAt: '2026-11-12 10:20:08',
      latestReply: 'Could you please confirm the time of your purchase and the amount shown on your receipt? We will use these details to check the payment.',
      messages: [
        message('user', 'email', '2026-11-12 09:16:43', 'My payment went through, but my coin balance has not changed.'),
        receipt(87, '2026-11-12 09:16:46'),
        message('agent', 'email', '2026-11-12 09:35:21', 'Could you please confirm the time of your purchase and the amount shown on your receipt? We will use these details to check the payment.', 'sent'),
        message('user', 'email', '2026-11-12 10:20:08', 'Thank you. I paid $9.99 at about 9:10 this morning. The payment is marked as completed.'),
        message('system', 'internal', '2026-11-12 10:20:08', '用户邮件已追加至原反馈，不重复发送自动回执。')
      ]
    },
    {
      id: 86,
      source: 'h5',
      userId: 'U100241',
      email: 'riley@example.net',
      name: 'Riley',
      type: '播放问题',
      content: 'Episode 12 keeps buffering even though other videos load normally. I have already tried refreshing the page.',
      subject: 'Episode 12 keeps buffering',
      status: 'pending',
      ack: 'failed',
      ackReason: '邮件服务暂时不可用，可重试发送。',
      ackAt: null,
      createdAt: '2026-11-12 09:04:19',
      updatedAt: '2026-11-12 09:04:22',
      latestReply: '',
      messages: [
        message('user', 'h5', '2026-11-12 09:04:19', 'Episode 12 keeps buffering even though other videos load normally. I have already tried refreshing the page.'),
        receipt(86, '2026-11-12 09:04:22', 'failed'),
        message('system', 'internal', '2026-11-12 09:04:22', '自动回执发送失败：邮件服务暂时不可用。反馈已正常保存，处理状态保持待处理。')
      ]
    },
    {
      id: 85,
      source: 'email',
      userId: null,
      email: 'taylor@example.com',
      name: 'Taylor',
      type: '账号问题',
      content: 'I changed my phone and cannot find my previous purchases. How can I get access to them again?',
      subject: 'Access to purchases on my new phone',
      status: 'pending',
      ack: 'sent',
      ackReason: '',
      ackAt: '2026-11-12 08:42:34',
      createdAt: '2026-11-12 08:42:31',
      updatedAt: '2026-11-12 08:42:34',
      latestReply: '',
      messages: [
        message('user', 'email', '2026-11-12 08:42:31', 'I changed my phone and cannot find my previous purchases. How can I get access to them again?'),
        receipt(85, '2026-11-12 08:42:34')
      ]
    },
    {
      id: 84,
      source: 'email',
      userId: null,
      email: 'casey@example.net',
      name: 'Casey',
      type: '其他',
      content: 'Where can I find the title of the drama in the advertisement I saw yesterday?',
      subject: 'Looking for a drama title',
      status: 'pending',
      ack: 'skipped',
      ackReason: '历史邮件导入，不补发自动回执。',
      ackAt: null,
      createdAt: '2026-11-11 17:26:04',
      updatedAt: '2026-11-12 10:10:02',
      latestReply: '',
      messages: [
        message('user', 'email', '2026-11-11 17:26:04', 'Where can I find the title of the drama in the advertisement I saw yesterday?'),
        message('system', 'internal', '2026-11-12 10:10:02', '历史邮件已导入；不补发自动回执。此记录仅演示历史导入规则。')
      ]
    },
    {
      id: 83,
      source: 'h5',
      userId: 'U100219',
      email: 'kai@example.com',
      name: 'Kai',
      type: '播放问题',
      content: 'The subtitles disappear after I rotate my phone to landscape mode.',
      subject: 'Subtitles disappear in landscape mode',
      status: 'done',
      ack: 'sent',
      ackReason: '',
      ackAt: '2026-11-11 15:15:42',
      createdAt: '2026-11-11 15:15:40',
      updatedAt: '2026-11-11 16:32:17',
      latestReply: 'Please reopen the episode and switch subtitles on again in the player settings. If the issue continues, please let us know your browser and device model.',
      messages: [
        message('user', 'h5', '2026-11-11 15:15:40', 'The subtitles disappear after I rotate my phone to landscape mode.'),
        receipt(83, '2026-11-11 15:15:42'),
        message('agent', 'email', '2026-11-11 16:30:02', 'Please reopen the episode and switch subtitles on again in the player settings. If the issue continues, please let us know your browser and device model.', 'sent'),
        message('user', 'email', '2026-11-11 16:32:17', 'That worked. The subtitles are showing again. Thank you!'),
        message('system', 'internal', '2026-11-11 16:32:17', '客服将处理状态更新为已处理。')
      ]
    },
    {
      id: 82,
      source: 'email',
      userId: null,
      email: 'sam@example.net',
      name: 'Sam',
      type: '其他',
      content: 'Do you have a way to add dramas to a watchlist?',
      subject: 'Watchlist question',
      status: 'closed',
      ack: 'sent',
      ackReason: '',
      ackAt: '2026-11-11 13:08:22',
      createdAt: '2026-11-11 13:08:19',
      updatedAt: '2026-11-11 14:45:00',
      latestReply: 'Thank you for the suggestion. We have recorded your request for a watchlist feature.',
      messages: [
        message('user', 'email', '2026-11-11 13:08:19', 'Do you have a way to add dramas to a watchlist?'),
        receipt(82, '2026-11-11 13:08:22'),
        message('agent', 'email', '2026-11-11 13:40:28', 'Thank you for the suggestion. We have recorded your request for a watchlist feature.', 'sent'),
        message('system', 'internal', '2026-11-11 14:45:00', '客服已关闭反馈。')
      ]
    },
    {
      id: 81,
      source: 'h5',
      userId: 'U100285',
      email: '',
      name: 'Quinn',
      type: '播放问题',
      content: 'The next episode button sometimes does not respond after an episode ends.',
      subject: 'Next episode button does not respond',
      status: 'pending',
      ack: 'off',
      ackReason: '未提供联系邮箱，无法发送邮件回执。',
      ackAt: null,
      createdAt: '2026-11-11 11:34:56',
      updatedAt: '2026-11-11 11:34:56',
      latestReply: '',
      messages: [
        message('user', 'h5', '2026-11-11 11:34:56', 'The next episode button sometimes does not respond after an episode ends.'),
        message('system', 'internal', '2026-11-11 11:34:56', '用户未提供联系邮箱，未发送自动回执。')
      ]
    },
    {
      id: 80,
      source: 'h5',
      userId: 'U100274',
      email: 'invalid@@example.com',
      name: 'Rowan',
      type: '账号问题',
      content: 'I cannot sign in again after clearing my browser data.',
      subject: 'Unable to sign in after clearing browser data',
      status: 'pending',
      ack: 'skipped',
      ackReason: '联系邮箱格式无效，已跳过自动回执。',
      ackAt: null,
      createdAt: '2026-11-11 10:12:08',
      updatedAt: '2026-11-11 10:12:08',
      latestReply: '',
      messages: [
        message('user', 'h5', '2026-11-11 10:12:08', 'I cannot sign in again after clearing my browser data.'),
        message('system', 'internal', '2026-11-11 10:12:08', '联系邮箱格式无效，反馈已保存；自动回执已跳过。')
      ]
    },
    {
      id: 79,
      source: 'email',
      userId: null,
      email: 'alex@example.com',
      name: 'Alex',
      type: '账号问题',
      content: 'I can sign in on my phone, but I cannot see the same account on my tablet.',
      subject: 'Account access on a second device',
      status: 'processing',
      ack: 'sent',
      ackReason: '',
      ackAt: '2026-11-10 18:22:16',
      createdAt: '2026-11-10 18:22:13',
      updatedAt: '2026-11-12 09:50:03',
      latestReply: 'Please confirm that both devices are using the same sign-in method. You can reply with the browser and device models so that we can check further.',
      messages: [
        message('user', 'email', '2026-11-10 18:22:13', 'I can sign in on my phone, but I cannot see the same account on my tablet.'),
        receipt(79, '2026-11-10 18:22:16'),
        message('agent', 'email', '2026-11-12 09:50:03', 'Please confirm that both devices are using the same sign-in method. You can reply with the browser and device models so that we can check further.', 'sent'),
        message('system', 'internal', '2026-11-12 09:50:03', '已同步邮箱中的人工回复，并更新最新回复。此状态为演示。')
      ]
    },
    {
      id: 78,
      source: 'h5',
      userId: 'U100182',
      email: 'emery@example.net',
      name: 'Emery',
      type: '充值问题',
      content: 'I was charged twice for the same purchase. Could you check whether both payments went through?',
      subject: 'Question about two payment entries',
      status: 'closed',
      ack: 'sent',
      ackReason: '',
      ackAt: '2026-11-10 16:40:08',
      createdAt: '2026-11-10 16:40:05',
      updatedAt: '2026-11-11 09:12:30',
      latestReply: 'We have reviewed the payment information you provided. The second entry is a pending authorization. Please contact us again if it changes to a completed charge.',
      messages: [
        message('user', 'h5', '2026-11-10 16:40:05', 'I was charged twice for the same purchase. Could you check whether both payments went through?'),
        receipt(78, '2026-11-10 16:40:08'),
        message('agent', 'email', '2026-11-11 09:10:14', 'We have reviewed the payment information you provided. The second entry is a pending authorization. Please contact us again if it changes to a completed charge.', 'sent'),
        message('user', 'email', '2026-11-11 09:12:30', 'Understood. Thanks for checking.'),
        message('system', 'internal', '2026-11-11 09:12:30', '客服已关闭反馈。此记录及支付判断均为合成示例。')
      ]
    }
  ];

  window.FeedbackSeed = { settings, records, now: '2026-11-12 10:32:08' };
})();
