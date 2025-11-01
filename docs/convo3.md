2025-11-01T02:27:19.519Z] [AIReceptionist] INFO [ToolInit] No standard tools requested
[2025-11-01T02:27:19.519Z] [AIReceptionist] INFO [ToolInit] No custom tools provided
[2025-11-01T02:27:19.519Z] [AIReceptionist] INFO [ToolInit] Long-term memory disabled, skipping database tools
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [ToolRegistry] Registered tool: send_email
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [EmailTools] Registered email tools with provider registry
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [ToolInit] Email tools registered
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [ToolInit] Total tools registered: 1
[2025-11-01T02:27:19.520Z] [AIReceptionist] WARN [EmailAllowlist] No database available for persistence
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [ResourceInit] Resources initialized: voice, sms, email, text
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [AIReceptionist] Initialized successfully
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [AIReceptionist] - Registered providers: ai, postmark
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [AIReceptionist] - Registered tools: 1
[2025-11-01T02:27:19.520Z] [AIReceptionist] INFO [AIReceptionist] - Available channels: voice, sms, email, text
[Nest] 1  - 11/01/2025, 2:27:19 AM     LOG [AIReceptionistTestService] ✅ AI Receptionist Test Service initialized successfully
[Nest] 1  - 11/01/2025, 2:27:19 AM     LOG [NestApplication] Nest application successfully started +2ms
[Nest] 1  - 11/01/2025, 2:27:19 AM     LOG [Bootstrap] ✅ Loctelli Backend Application started successfully on port 8080
[Nest] 1  - 11/01/2025, 2:27:19 AM     LOG [Bootstrap] 📊 Health check available at: http://localhost:8080/status
[Nest] 1  - 11/01/2025, 2:27:19 AM     LOG [Bootstrap] 🔗 API documentation available at: http://localhost:8080/api
[Nest] 1  - 11/01/2025, 2:27:42 AM   DEBUG [JwtAuthGuard] ✅ Public route allowed: GET /ai-receptionist/version
[Nest] 1  - 11/01/2025, 2:27:42 AM   DEBUG [JwtAuthGuard] 🔒 Auth guard checking route: GET /ai-receptionist/version
[Nest] 1  - 11/01/2025, 2:29:05 AM   DEBUG [WebhookSecurityMiddleware] ✅ Webhook security passed from IP: 18.217.206.57
[Nest] 1  - 11/01/2025, 2:29:05 AM   DEBUG [JwtAuthGuard] 🔒 Auth guard checking route: POST /ai-receptionist/webhooks/email
[Nest] 1  - 11/01/2025, 2:29:05 AM   DEBUG [JwtAuthGuard] ✅ Public route allowed: POST /ai-receptionist/webhooks/email
[Nest] 1  - 11/01/2025, 2:29:05 AM     LOG [AIReceptionistTestController] Received email webhook
[Nest] 1  - 11/01/2025, 2:29:05 AM   DEBUG [AIReceptionistTestController] {"payload":{"FromName":"Kenneth Atchon","MessageStream":"inbound","From":"kenneth.atchon@hotmail.com","FromFull":{"Email":"kenneth.atchon@hotmail.com","Name":"Kenneth Atchon","MailboxHash":""},"To":"\"AI Receptionist\" <info@inbound.loctelli.com>","ToFull":[{"Email":"info@inbound.loctelli.com","Name":"AI Receptionist","MailboxHash":""}],"Cc":"","CcFull":[],"Bcc":"","BccFull":[],"OriginalRecipient":"info@inbound.loctelli.com","Subject":"Inquiry on Status","MessageID":"6e50ca35-43de-4114-9e0e-5091c2395eaa","ReplyTo":"","MailboxHash":"","Date":"Sat, 1 Nov 2025 02:28:55 +0000","TextBody":"Hi,\n\nI have a delivery out. Could you tell me the status of it?\n\nThank you,\nKenneth","HtmlBody":"<html>\n<head>\n<meta http-equiv=\"Content-Type\" c\"text/html; charset=iso-8859-1\">\n<style type=\"text/css\" style=\"display:none;\"> P {margin-top:0;margin-bottom:0;} </style>\n</head>\n<body dir=\"ltr\">\n<div style=\"font-family: &quot;Calibri&quot;, &quot;Helvetica&quot;, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);\" class=\"elementToProof\">\nHi,</div>\n<div style=\"font-family: &quot;Calibri&quot;, &quot;Helvetica&quot;, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);\" class=\"elementToProof\">\n<br>\n</div>\n<div style=\"font-family: &quot;Calibri&quot;, &quot;Helvetica&quot;, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);\" class=\"elementToProof\">\nI have a delivery out. Could you tell me the status of it?</div>\n<div style=\"font-family: &quot;Calibri&quot;, &quot;Helvetica&quot;, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);\" class=\"elementToProof\">\n<br>\n</div>\n<div style=\"font-family: &quot;Calibri&quot;, &quot;Helvetica&quot;, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);\" class=\"elementToProof\">\nThank you,</div>\n<div style=\"font-family: &quot;Calibri&quot;, &quot;Helvetica&quot;, sans-serif; font-size: 12pt; color: rgb(0, 0, 0);\" class=\"elementToProof\">\nKenneth</div>\n</body>\n</html>","StrippedTextReply":"","Tag":"","Headers":[{"Name":"Return-Path","Value":"<kenneth.atchon@hotmail.com>"},{"Name":"Received","Value":"by p-pm-inboundg01a-aws-euwest1a.inbound.postmarkapp.com (Postfix, from userid 996)\tid 68701453B34; Sat,  1 Nov 2025 02:29:04 +0000 (UTC)"},{"Name":"X-Spam-Checker-Version","Value":"SpamAssassin 3.4.0 (2014-02-07) on\tp-pm-inboundg01a-aws-euwest1a"},{"Name":"X-Spam-Status","Value":"No"},{"Name":"X-Spam-Score","Value":"1.1"},{"Name":"X-Spam-Tests","Value":"DKIM_SIGNED,DKIM_VALID,DKIM_VALID_AU,FORGED_HOTMAIL_RCVD2,\tFREEMAIL_FROM,HTML_MESSAGE,RCVD_IN_DNSWL_BLOCKED,RCVD_IN_MSPIKE_H2,\tRCVD_IN_VALIDITY_RPBL_BLOCKED,RCVD_IN_VALIDITY_SAFE_BLOCKED,\tRCVD_IN_ZEN_BLOCKED_OPENDNS,SPF_HELO_NONE,SPF_PASS"},{"Name":"Received-SPF","Value":"pass (hotmail.com: Sender is authorized to use 'kenneth.atchon@hotmail.com' in 'mfrom' identity (mechanism 'include:spf2.outlook.com' matched)) receiver=p-pm-inboundg01a-aws-euwest1a; identity=mailfrom; envelope-from=\"kenneth.atchon@hotmail.com\"; helo=OS8PR02CU002.outbound.protection.outlook.com; client-ip=52.103.66.59"},{"Name":"Received","Value":"from OS8PR02CU002.outbound.protection.outlook.com (mail-japanwestazolkn19012059.outbound.protection.outlook.com [52.103.66.59])\t(using TLSv1.2 with cipher ECDHE-RSA-AES256-GCM-SHA384 (256/256 bits))\t(No client certificate requested)\tby p-pm-inboundg01a-aws-euwest1a.inbound.postmarkapp.com (Postfix) with ESMTPS id EBDCD40582F\tfor <info@inbound.loctelli.com>; Sat,  1 Nov 2025 02:29:03 +0000 (UTC)"},{"Name":"ARC-Seal","Value":"i=1; a=rsa-sha256; s=arcselector10001; d=microsoft.com; cv=none; b=qAKH8hXWGriZ6cTJj/H3AvE2o3ZLriFHY44FgGStyvh4uxVVb5THHHgpCwQ++i+0EQXX4gfHGXfAU2zHTvPFmznq0p8BRq8Gt3wWl9s8m/IYpnRAwNpWZyo9BZ/65A9XFzAnZNWOJ+/YP3rr7PPvdL4XHJ7cCJ9tJyU8lTzbj8F6/wNIWp32uUtHJa8npwxZrcnFRqHwJnU2aez2f4pf5G6/zhvE1WmtLmgaz61DScQ+mu/k1Yi+maQKQOG01iLbvISoFRf8JeRWIE7OqbOCutu+MxuE9GwFkyyTq9iqZF4zpxhqi61tL2PuzsNNAGlDWRWHVJdGiI/NvvV74VGF4Q=="},{"Name":"ARC-Message-Signature","Value":"i=1; a=rsa-sha256; c=relaxed/relaxed; d=microsoft.com; s=arcselector10001; h=From:Date:Subject:Message-ID:Content-Type:MIME-Version:X-MS-Exchange-AntiSpam-MessageData-ChunkCount:X-MS-Exchange-AntiSpam-MessageData-0:X-MS-Exchange-AntiSpam-MessageData-1; bh=ephb8a1VK8VdW4YFeN4pejQ60HNcHwlNMwjCCZSH+Fg=; b=V0K0eZuDmAdNtlB3F1Lo8C24ZV2Uc0hYy++tAjqa5yZVrSxE/6PRO/TF3t1fIkTmF/J7iPv4NCN+HF9t0Oky0WuOqHPW/h791Tv4UYKFtK/P5b2XQG7SU5/EuQORaMjtC3cPLRpO8TmsVcv1gjt5va1MDExFtLY3ucCfdZYAAoWTd41vUgrHwucgSHUxHLUwHw8gkoF/1Rj/PA97dh/gk6/nt4IqMNITUpabq0u1ZsfOY3+MDUgMKTY5D0ZwindpKiF9QmjfF91W6S/8Lm9EAK7Qk2p2eUyFTM3dNF7WchDa6KylkY+i6uaGyvnNtwrJWgqnRgm+VgxYrkJQf19T5Q=="},{"Name":"ARC-Authentication-Results","Value":"i=1; mx.microsoft.com 1; spf=none; dmarc=none; dkim=none; arc=none"},{"Name":"DKIM-Signature","Value":"v=1; a=rsa-sha256; c=relaxed/relaxed; d=hotmail.com; s=selector1; h=From:Date:Subject:Message-ID:Content-Type:MIME-Version:X-MS-Exchange-SenderADCheck; bh=ephb8a1VK8VdW4YFeN4pejQ60HNcHwlNMwjCCZSH+Fg=; b=ueRKgk4DA73+Gzzv4PGGSrSmEgR+6AO5blTOfVFetWP3gG9g9aGSuRHF8hheOBFRULXucQH9bLJGLI090eKO8qkCvG4fu2g/0IYm3YJ8STRJ7Vdds4ugdJcf+HhGSs0f/8FFzI0i7Rd9xci4ZZTaEqMeeWgBkN/axjEfKTjrEomdQckR6jeMqjBrB+Xp01ofKH8IYVmFsVVfz39XimocLO18X0jWN5VuuInHVHo4naxMJkoo6ep7w8OK+peLLEMUsFAcu08NcJT8tiv7ovmDcjjPTAnw2NVUZfGWtSihS0B5hdxoWiZDM06+j3Fuo3zei7CjLsij9Kg383LqZXj8og=="},{"Name":"Received","Value":"from SEZPR04MB6729.apcprd04.prod.outlook.com (2603:1096:101:f3::10) by TY1PPF18F5FBD30.apcprd04.prod.outlook.com (2603:1096:408::a8d) with Microsoft SMTP Server (version=TLS1_2, cipher=TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384) id 15.20.9275.15; Sat, 1 Nov 2025 02:28:55 +0000"},{"Name":"Received","Value":"from SEZPR04MB6729.apcprd04.prod.outlook.com ([fe80::8ecd:f067:6b30:c77c]) by SEZPR04MB6729.apcprd04.prod.outlook.com ([fe80::8ecd:f067:6b30:c77c%7]) with mapi id 15.20.9275.013; Sat, 1 Nov 2025 02:28:55 +0000"},{"Name":"Thread-Topic","Value":"Inquiry on Status"},{"Name":"Thread-Index","Value":"AQHcStcsUe9qy/kEgkW6KJqnT+uvmw=="},{"Name":"Message-ID","Value":"<SEZPR04MB67297AD80155076F2471897A89F9A@SEZPR04MB6729.apcprd04.prod.outlook.com>"},{"Name":"Accept-Language","Value":"en-US"},{"Name":"X-MS-Has-Attach","Value":""},{"Name":"X-MS-TNEF-Correlator","Value":""},{"Name":"msip_labels","Value":""},{"Name":"x-ms-publictraffictype","Value":"Email"},{"Name":"x-ms-traffictypediagnostic","Value":"SEZPR04MB6729:EE_|TY1PPF18F5FBD30:EE_"},{"Name":"x-ms-office365-filtering-correlation-id","Value":"943af426-dcac-403b-8a8c-08de18ee67b3"},{"Name":"x-microsoft-antispam","Value":"BCL:0;ARA:14566002|41001999006|15080799012|15030799006|19110799012|8060799015|8062599012|461199028|31061999003|40105399003|3412199025|440099028|13041999003|102099032;"},{"Name":"x-microsoft-antispam-message-info","Value":"sKzOWa0N4/AV7fEIzWCcNDztNW6a05/dwNS7AuREKFzacFmAXEntOjPQ8pDq52EptEK95bdZD5KJ/eZINGWAa1MRYqFxFtPSV2nAdFY7v9XAYIYOYTuXN2RoQfA1ZHDzjVATFgd+4/Il7PsQ+dnBBymPBFBXFIKfbWulZrrn+yDc3lVilmBMG7aghJurZn9rGvl9NvNdJ6DF5t/VYmYmkKoOnuA6ZL4hVxPw8lzCxSPy3pai3hbGJaXAWznpluvgXneorPGxU9Px/PoVN4wfWDeI7nHNLfmmeLmrN9E3gMKpYbS0iLjgNjzR1rV/Nil0gBzy9zshUgpIGfVCwGC8H1LYp1Ib/4RVhFFRRWyIBkyCH9UlCcVMTGGpAiktbNspusFip48jTB+aMJkZdqVjKhrx29cHpZgYI/Q1Mk2l7UJI3ci7W7dA/60WPI0Fusxvj4VkEQOxv1gSy8TORSzAjb1MczDbTIvsuX8DnjtsKsyDGeFNrZIsCuOB6iiiIBsqfLpD2IQ5PezgWIHrcbIjodNXtQxgzU9+5ITGnmA0cJ9w32OOrfVlq3vbKcVWOtoA176w4LoieZ1fR7Qs77o3hLQ/fOTHP3NAXppxWRioFv9UehLn9iL9r30wlHzF/pYvIS77AN0TKiAHGJbDRGSew3yVk/Z4rp9CP4fCWXR07IBGfOLJm0bve9lAE6DT1/45SlcDZst2ZgTnYPI+Se+FILmvjnxzk7CAfzH2dyyls5F51S2qLEB3UjUTwayyUDIFiUnGzwxAEdBQ/NwIPHsGuzmJvnsR0gRFctxHVIBlRs10fbpCJ86S8z/yIurLl1zzp7MZ7+7By6me5x4vKHlYLI5tkQtynWrRwueZTGVdmtRrAD8K+nmbAqhSEP7uFGjbmsPEpum00+uW5qShyCtwK+Yjf8Nx35llCdMPt0wO/AwEYSH53DTpwsPBIICjnCDi+3vvxO6GvlI9vLmg5EOg4itK6vMaIA0lsQoK/eYxEvBSPio1XxToSPq/mhDWovHuGaU1ISZlPuIf1IH+dVe6wZb+Vcb+arwTmZVQQbqW6JT0eVPUMnRQcFuDaFQivj5quAunMKWx5PVf9BbID9l/3ostGjNtKMRzFwGv27CXHxO8M21JC6kxKADP/r7CA1zt8YQHNK/uYCtL/0eioxXBKBl2gEy8Yk/TXWhob80yGlAGEjr52fu8YXe/X20AjaWI5xmOCn7RnG9js4lQ1Eaft/NfgOO316WV+tcGGxU1wth+fHf8vDnQCs2ZMrZgK90m"},{"Name":"x-ms-exchange-antispam-messagedata-chunkcount","Value":"1"},{"Name":"x-ms-exchange-antispam-messagedata-0","Value":"4kq3Nw1/CKWmOyn5UmuVZ/WldND5D0Lqyqbk6B2vz2QkQj7/abesBY2Y11B5PQ8KC2n4Y43EJTL4R0MwPO3FfVSjVEoTKfR7mWl+VlbdyI/A9yM8zwKiW5wraEbIc4ZvwE7KWiI0FVGEvWLPXxcf/q4o+8RRyNyB+9qmTKM8uNjrn8/2QrYPcXiadHRvwe/L3TJNcXjttudHRwyPmhiwSs8Al/h83tKFtcDvMxRDQDlIeOqW4ZBFtqxeyJE+WBEzp4d1pG79OZBGlrH616NjIK0peCYx4C5Zjb8XTnk7uWVHaFXVzRa9u06ZVkmS4wpdwsVrN2BBePosO5S90OAZEwsIdiP75oQou1I0goSwXglz9kfreob8pBdq0+1Pq3EZouD+wYzZSEFsRNnRvycMDveeITXH8NcUAJfgyzvRzB4D4PRM7oF7M5e2b6aV05TMayti9mB88/Onm6NcaseVA9lyZ3FF6wbsWU3u3CQMgQU2dlQXDOa01/Gb1Zro0OZGuqhtWVgZaYkP3PGwv04SzWqVimgXw/VEr22V77glbKdzPcKafuDjCbrhPRd6bDEA4hTWLvD+TUNuL4BbQVN3ZHPmhNTSbyj7jV4EVdNrJ/T7wyWeELOw+yGDd6eXGtOuEamIfpAEOBsljWVrsEz6MevMcAyscVnnc3ibXP1/UqFiNMijVa1g+5Zl6NEc0ncfSSuX1svqki24vg+yDLNs9P1u0c8hFV8IEK4BJbueszkeH0VYvmdWA4niF+S+pzHL1wu51I0mwbNuySMKd9pfJHdPmxvMlkK9cXGBZHuHoakxgEnA/z28Ee05BXe5iHSfvv8kbYBi6CoGAn1g0FDGHTDrm+ozT3VpBr8MxSsCPJpfCs+wAEDPukMbvb8p4nWyaNTRdYOJy7lfn6rWPY8ExWLRWTc/Ix838NFSz4ZotpxKmn1sWmWN+R9egLBU9//FXb05XcIA5B+t9CYorqZ8+Of1ez03kkyd29tL6U7UpCQpLS/x8Xx/P4NOndvMauutUA7NgQEGdMoUQGYDF0qf6qUEr7iM6zD5w/UHorVSpa04t/6M0nMZqMB35WwUanYJPoDiJox85tXSLJoGvoB95/h90uyxtt+9AhIiG5bB6eQIHOGrj1N4H7YuSG4NRwf4RegCw11YBs55rE7fh21GoHIcuVtW7o1tiJZNao6pU8mnocfDkbVmeW0CpcuP7fBNdYbWvaDJZlR6Zc0XJKl9nY5zJcy4VBCZoIfQdZrdV+8="},{"Name":"MIME-Version","Value":"1.0"},{"Name":"X-OriginatorOrg","Value":"sct-15-20-9052-0-msonline-outlook-38779.templateTenant"},{"Name":"X-MS-Exchange-CrossTenant-AuthAs","Value":"Internal"},{"Name":"X-MS-Exchange-CrossTenant-AuthSource","Value":"SEZPR04MB6729.apcprd04.prod.outlook.com"},{"Name":"X-MS-Exchange-CrossTenant-RMS-PersistedConsumerOrg","Value":"00000000-0000-0000-0000-000000000000"},{"Name":"X-MS-Exchange-CrossTenant-Network-Message-Id","Value":"943af426-dcac-403b-8a8c-08de18ee67b3"},{"Name":"X-MS-Exchange-CrossTenant-originalarrivaltime","Value":"01 Nov 2025 02:28:55.4219 (UTC)"},{"Name":"X-MS-Exchange-CrossTenant-fromentityheader","Value":"Hosted"},{"Name":"X-MS-Exchange-CrossTenant-id","Value":"84df9e7f-e9f6-40af-b435-aaaaaaaaaaaa"},{"Name":"X-MS-Exchange-CrossTenant-rms-persistedconsumerorg","Value":"00000000-0000-0000-0000-000000000000"},{"Name":"X-MS-Exchange-Transport-CrossTenantHeadersStamped","Value":"TY1PPF18F5FBD30"}],"Attachments":[]}}
  hasReferences: false,
  attachmentCount: 0,
  fromName: 'Kenneth Atchon',
  subject: 'Inquiry on Status',
  messageId: '6e50ca35-43de-4114-9e0e-5091c2395eaa',
  hadInReplyTo: false,
  hadReferences: false
}
[2025-11-01T02:29:05.080Z] [AIReceptionist] INFO [EmailResource] Stored inbound email in conversation conv_1761964145080_5w0a6jh {
  emailId: '6e50ca35-43de-4114-9e0e-5091c2395eaa',
  threadRoot: '6e50ca35-43de-4114-9e0e-5091c2395eaa',
[2025-11-01T02:29:05.076Z] [AIReceptionist] INFO [WebhookRouter] Routing email webhook { sessionId: undefined }
[2025-11-01T02:29:05.077Z] [AIReceptionist] INFO [WebhookRouter] Creating session from webhook { type: 'email' }
[2025-11-01T02:29:05.078Z] [AIReceptionist] INFO [SessionManager] Created email session {
  sessionId: 'email_1761964145078_o355gpw',
  conversationId: 'conv_1761964145078_ww87f61',
  identifier: 'kenneth.atchon@hotmail.com'
}
[2025-11-01T02:29:05.078Z] [AIReceptionist] INFO [EmailResource] Handling inbound email webhook
[2025-11-01T02:29:05.079Z] [AIReceptionist] INFO [EmailResource] Creating new conversation for kenneth.atchon@hotmail.com {
  tags: undefined,
  archiveCc: undefined
}
}
  inReplyTo: '<6e50ca35-43de-4114-9e0e-5091c2395eaa@mtasv.net>',
[2025-11-01T02:29:08.881Z] [AIReceptionist] INFO [PostmarkProvider] Email sent successfully {
  attachmentCount: 0
  subject: 'Re: Inquiry on Status',
  messageId: '8216372a-bf09-4295-a2d4-3293b774a90c',
  cc: undefined,
  messageIdFormatted: '<8216372a-bf09-4295-a2d4-3293b774a90c@mtasv.net>',
  to: [ 'kenneth.atchon@hotmail.com' ],
  from: 'AI Receptionist <info@inbound.loctelli.com>',
  references: '<6e50ca35-43de-4114-9e0e-5091c2395eaa@mtasv.net>',
  messageStream: 'inbound',
  hasCc: false,
  hasBcc: false
}
[2025-11-01T02:29:05.081Z] [AIReceptionist] INFO [EmailResource] Triggering AI auto-reply for kenneth.atchon@hotmail.com
[2025-11-01T02:29:05.084Z] [AIReceptionist] INFO [OpenAIProvider] Chat request for conversation: conv_1761964145080_5w0a6jh
[2025-11-01T02:29:05.084Z] [AIReceptionist] INFO [OpenAIProvider] User message: A customer email was received from kenneth.atchon@hotmail.com with the subject "Inquiry on Status".
      Respond to this customer email.
      Use the send_email tool to send your response.
[2025-11-01T02:29:05.084Z] [AIReceptionist] INFO [OpenAIProvider] Available tools: 1
[Agent] Executing tool 'send_email'
[Agent] Tool 'send_email' executed
[2025-11-01T02:29:08.629Z] [AIReceptionist] INFO [ToolRegistry] Executing tool 'send_email' on channel 'email'
[2025-11-01T02:29:08.882Z] [AIReceptionist] INFO [OpenAIProvider] Chat request for conversation: synthesis-1761964148882
[2025-11-01T02:29:08.882Z] [AIReceptionist] INFO [OpenAIProvider] User message: Based on these tool results, provide a natural response to the user:
[2025-11-01T02:29:08.629Z] [AIReceptionist] INFO [SendEmailTool] Sending email via email channel
Tool: send_email
Result: {"messageId":"8216372a-bf09-4295-a2d4-3293b774a90c"}
[2025-11-01T02:29:08.882Z] [AIReceptionist] INFO [OpenAIProvider] Available tools: 0
[2025-11-01T02:29:08.629Z] [AIReceptionist] INFO [PostmarkProvider] Sending email via Postmark {
  to: [ 'kenneth.atchon@hotmail.com' ],
  from: 'AI Receptionist <info@inbound.loctelli.com>',
  replyTo: undefined,
  subject: 'Re: Inquiry on Status',
  cc: undefined,
  hasTextBody: true,
  hasHtmlBody: true,
  textBodyLength: 260,
  htmlBodyLength: 290,
  attachmentCount: 0,
  attachments: undefined,
  headers: {
    'In-Reply-To': '<6e50ca35-43de-4114-9e0e-5091c2395eaa@mtasv.net>',
    References: '<6e50ca35-43de-4114-9e0e-5091c2395eaa@mtasv.net>'
  },


  -------------------


[Nest] 1  - 11/01/2025, 2:32:55 AM   DEBUG [WebhookSecurityMiddleware] ✅ Webhook security passed from IP: 18.217.206.57
[Nest] 1  - 11/01/2025, 2:32:55 AM   DEBUG [JwtAuthGuard] 🔒 Auth guard checking route: POST /ai-receptionist/webhooks/email
[Nest] 1  - 11/01/2025, 2:32:55 AM   DEBUG [JwtAuthGuard] ✅ Public route allowed: POST /ai-receptionist/webhooks/email
[Nest] 1  - 11/01/2025, 2:32:55 AM     LOG [AIReceptionistTestController] Received email webhook
[Nest] 1  - 11/01/2025, 2:32:55 AM   DEBUG [AIReceptionistTestController] {"payload":{"FromName":"Ken Atchon","MessageStream":"inbound","From":"kennethatchon@gmail.com","FromFull":{"Email":"kennethatchon@gmail.com","Name":"Ken Atchon","MailboxHash":""},"To":"info@inbound.loctelli.com","ToFull":[{"Email":"info@inbound.loctelli.com","Name":"","MailboxHash":""}],"Cc":"","CcFull":[],"Bcc":"","BccFull":[],"OriginalRecipient":"info@inbound.loctelli.com","Subject":"Inquiry Product","MessageID":"7e0df9f4-ecc2-4990-aa26-aee425cdc387","ReplyTo":"","MailboxHash":"","Date":"Fri, 31 Oct 2025 19:32:46 -0700","TextBody":"Hi,\n\nI have a delivery out. Could you tell me the status of it?\n\nThank you,\nKenneth","HtmlBody":"<div dir=\"ltr\">\n<div class=\"gmail-rps_29e1\"><div dir=\"ltr\"><div style=\"font-family:&quot;Calibri&quot;,&quot;Helvetica&quot;,sans-serif;font-size:12pt;color:rgb(0,0,0)\" class=\"gmail-x_elementToProof\">Hi,</div><div style=\"font-family:&quot;Calibri&quot;,&quot;Helvetica&quot;,sans-serif;font-size:12pt;color:rgb(0,0,0)\" class=\"gmail-x_elementToProof\"><br></div><div style=\"font-family:&quot;Calibri&quot;,&quot;Helvetica&quot;,sans-serif;font-size:12pt;color:rgb(0,0,0)\" class=\"gmail-x_elementToProof\">I have a delivery out. Could you tell me the status of it?</div><div style=\"font-family:&quot;Calibri&quot;,&quot;Helvetica&quot;,sans-serif;font-size:12pt;color:rgb(0,0,0)\" class=\"gmail-x_elementToProof\"><br></div><div style=\"font-family:&quot;Calibri&quot;,&quot;Helvetica&quot;,sans-serif;font-size:12pt;color:rgb(0,0,0)\" class=\"gmail-x_elementToProof\">Thank you,</div><div style=\"font-family:&quot;Calibri&quot;,&quot;Helvetica&quot;,sans-serif;font-size:12pt;color:rgb(0,0,0)\" class=\"gmail-x_elementToProof\">Kenneth</div></div></div>\n\n</div>","StrippedTextReply":"","Tag":"","Headers":[{"Name":"Return-Path","Value":"<kennethatchon@gmail.com>"},{"Name":"Received","Value":"by p-pm-inboundg07c-aws-useast1c.inbound.postmarkapp.com (Postfix, from userid 996)\tid 3BF744074F5; Sat,  1 Nov 2025 02:32:55 +0000 (UTC)"},{"Name":"X-Spam-Checker-Version","Value":"SpamAssassin 3.4.0 (2014-02-07) on\tp-pm-inboundg07c-aws-useast1c"},{"Name":"X-Spam-Status","Value":"No"},{"Name":"X-Spam-Score","Value":"-0.1"},{"Name":"X-Spam-Tests","Value":"DKIM_SIGNED,DKIM_VALID,DKIM_VALID_AU,FREEMAIL_FROM,HTML_MESSAGE,\tRCVD_IN_DNSWL_BLOCKED,RCVD_IN_MSPIKE_H2,RCVD_IN_VALIDITY_RPBL_BLOCKED,\tRCVD_IN_VALIDITY_SAFE_BLOCKED,RCVD_IN_ZEN_BLOCKED_OPENDNS,SPF_HELO_NONE,\tSPF_PASS"},{"Name":"Received-SPF","Value":"pass (gmail.com ... _spf.google.com: Sender is authorized to use 'kennethatchon@gmail.com' in 'mfrom' identity (mechanism 'include:_netblocks.google.com' matched)) receiver=p-pm-inboundg07c-aws-useast1c; identity=mailfrom; envelope-from=\"kennethatchon@gmail.com\"; helo=mail-yw1-f171.google.com; client-ip=209.85.128.171"},{"Name":"Received","Value":"from mail-yw1-f171.google.com (mail-yw1-f171.google.com [209.85.128.171])\t(using TLSv1.2 with cipher ECDHE-RSA-AES128-GCM-SHA256 (128/128 bits))\t(No client certificate requested)\tby p-pm-inboundg07c-aws-useast1c.inbound.postmarkapp.com (Postfix) with ESMTPS id 1FC5A406BDE\tfor <info@inbound.loctelli.com>; Sat,  1 Nov 2025 02:32:55 +0000 (UTC)"},{"Name":"Received","Value":"by mail-yw1-f171.google.com with SMTP id 00721157ae682-71d6014810fso32463817b3.0        for <info@inbound.loctelli.com>; Fri, 31 Oct 2025 19:32:55 -0700 (PDT)"},{"Name":"DKIM-Signature","Value":"v=1; a=rsa-sha256; c=relaxed/relaxed;        d=gmail.com; s=20230601; t=1761964374; x=1762569174; darn=inbound.loctelli.com;        h=to:subject:message-id:date:from:mime-version:from:to:cc:subject         :date:message-id:reply-to;        bh=HVROgcq3NX0HAjOYqaCOH3ZKmskiFZhdHqbGyx8nsho=;        b=Q8rMi1Yczur+EcS4+bPkFdcbj5P+nZCgF/I0CRmuQiU4AY6P4wzVaM/GW0DjInUkWA         aMzqTXgV2ahj3lTM7w/fKGYR2Cfh+msGLzRFni77M0jPBaGhRidFxgJLZQ1f1YzsOo46         upvSD0mxvR9ZzYeylx3X8LUqnWMrkVUM77o7czIA7fhkSAIQdkive2/mLWb+JoD9jqOJ         2M1Mv7aA7eLUK4YHNYh5JzvhD6NOtOxoa0ZJ0B4xcP0c+LycWTkd88r/9dXMiQ7dpipi         y9BpPVg4kONkYv0M6wxcnCRC6Nd9rztI8jp/hupTMiuLJpCc2oGYmyFLnk4JaTeWTcdl         O1tg=="},{"Name":"X-Google-DKIM-Signature","Value":"v=1; a=rsa-sha256; c=relaxed/relaxed;        d=1e100.net; s=20230601; t=1761964374; x=1762569174;        h=to:subject:message-id:date:from:mime-version:x-gm-message-state         :from:to:cc:subject:date:message-id:reply-to;        bh=HVROgcq3NX0HAjOYqaCOH3ZKmskiFZhdHqbGyx8nsho=;        b=AunZLq50OwUKBCzH0s9nHFwqR3DGR8ocyLwxxSaDt1Ji80faoJeBN2u/oBTwy24RL4         owVOk1zLtKK8NZLp+2R+MT+zVokF+tAiGTs5rVF/pGWchrADngnKmGOzJvdGZ8CqTCSR         7EDZlC73akQ5JuylWy+hzO0Rd/SEihKvYxmE969kCO6UcJ2qVFZXg25rtwnPwOjXNpL9         UDVALoVizsmHy1rXDLB2sNIEIF2RoK+crYbm3LNhR7//PNqPRdM6Yn4vP0nybhnq5+Um         VUdE5IsBJmra4O9wh4gcBZ+VHkgYB+dRjn4/CnHd+2icMkDQbsty/Q08UxIFLwSwfuit         apkQ=="},{"Name":"X-Gm-Message-State","Value":"AOJu0YztwbP0uF39a7r5wVGGbzXYcWwJ8x7j7cng6IlmfZgCLKwDlEs/\ty7fjldJ6xnEZVzhQ4k78GdVBGXfMgBJOxM8eTEe1Xpg838yYrLj9GAsdtOJ1BUfJJvLbTYQtNRP\tthAVytjCki78JW4q91No4fzhWAAq9HYtBU7O+9w=="},{"Name":"X-Gm-Gg","Value":"ASbGncsWTVNTIsWi46makdl46XeogUIoUHY5MHzGae+P304NrBQcp+1yCM7PUhevNka\teeEWMxpgVFqyFgCK7x+YmDjU7dKx/ZbhNE7dluUwII0mp9ynqxoYZySjVW9RwUjV6AuUMi8emjY\tNUsqjyMR4oIygO/pgkLsbGA/EBLUhkaJojCiKsHpR7mB7SFGUSF2vXWqAQrr+0cS+pu9zYO/dzQ\tJZwltA6LakDEVmVnMfjcGB4tPvIv+hzDB+H1c+FuO7wYSbNdEIajrpW8Djk+RNCYEeaPA=="},{"Name":"X-Google-Smtp-Source","Value":"AGHT+IE/BaFwryEDkH/GV4hHrMymfJhtGVIcxsNNKf8iG9Cj1RxPJIaocTJVkYGG7+lGx/H7u58bs/WoK9sMOsACGws="},{"Name":"X-Received","Value":"by 2002:a05:690c:4b0e:b0:786:61c6:7e5c with SMTP id 00721157ae682-78661c6abe4mr1863057b3.40.1761964374446; Fri, 31 Oct 2025 19:32:54 -0700 (PDT)"},{"Name":"MIME-Version","Value":"1.0"},{"Name":"X-Gm-Features","Value":"AWmQ_blOg4ITAdCkBhCfIooj_MTcIAkt8qs646gO3SIeDKSaHP0hLcYEBcSiPEo"},{"Name":"Message-ID","Value":"<CAMii_diZswPs7+XLHeOcn=7J7=C-v3DaTJbjHoaqCXJ2pEnmow@mail.gmail.com>"}],"Attachments":[]}}
  from: 'AI Receptionist <info@inbound.loctelli.com>',
  replyTo: undefined,
  subject: 'Re: Inquiry Product',
[2025-11-01T02:32:55.963Z] [AIReceptionist] INFO [WebhookRouter] Routing email webhook { sessionId: undefined }
[2025-11-01T02:32:55.963Z] [AIReceptionist] INFO [WebhookRouter] Creating session from webhook { type: 'email' }
[2025-11-01T02:32:55.963Z] [AIReceptionist] INFO [SessionManager] Created email session {
  sessionId: 'email_1761964375963_l1gmgj1',
  conversationId: 'conv_1761964375963_yycb5dl',
  identifier: 'kennethatchon@gmail.com'
}
[2025-11-01T02:32:55.963Z] [AIReceptionist] INFO [EmailResource] Handling inbound email webhook
[2025-11-01T02:32:55.964Z] [AIReceptionist] INFO [EmailResource] Creating new conversation for kennethatchon@gmail.com {
  subject: 'Inquiry Product',
  messageId: '7e0df9f4-ecc2-4990-aa26-aee425cdc387',
  hadInReplyTo: false,
  hadReferences: false
}
[2025-11-01T02:32:55.964Z] [AIReceptionist] INFO [EmailResource] Stored inbound email in conversation conv_1761964375964_vet4vii {
  emailId: '7e0df9f4-ecc2-4990-aa26-aee425cdc387',
  threadRoot: '7e0df9f4-ecc2-4990-aa26-aee425cdc387',
  hasReferences: false,
  attachmentCount: 0,
  fromName: 'Ken Atchon',
  messageStream: 'inbound',
  hasCc: false,
  hasBcc: false
}
[2025-11-01T02:32:55.964Z] [AIReceptionist] INFO [EmailResource] Triggering AI auto-reply for kennethatchon@gmail.com
[2025-11-01T02:32:55.965Z] [AIReceptionist] INFO [OpenAIProvider] Chat request for conversation: conv_1761964375964_vet4vii
[2025-11-01T02:32:55.965Z] [AIReceptionist] INFO [OpenAIProvider] User message: A customer email was received from kennethatchon@gmail.com with the subject "Inquiry Product".
      Respond to this customer email.
      Use the send_email tool to send your response.
[2025-11-01T02:32:55.965Z] [AIReceptionist] INFO [OpenAIProvider] Available tools: 1
[Agent] Executing tool 'send_email'
[2025-11-01T02:32:59.913Z] [AIReceptionist] INFO [ToolRegistry] Executing tool 'send_email' on channel 'email'
[2025-11-01T02:32:59.913Z] [AIReceptionist] INFO [SendEmailTool] Sending email via email channel
[2025-11-01T02:32:59.913Z] [AIReceptionist] INFO [PostmarkProvider] Sending email via Postmark {
  to: [ 'kennethatchon@gmail.com' ],
  cc: undefined,
  hasTextBody: true,
  hasHtmlBody: true,
  textBodyLength: 366,
  htmlBodyLength: 397,
  attachmentCount: 0,
  attachments: undefined,
  headers: {
    'In-Reply-To': '<7e0df9f4-ecc2-4990-aa26-aee425cdc387@mtasv.net>',
    References: '<7e0df9f4-ecc2-4990-aa26-aee425cdc387@mtasv.net>'
  },
  tags: undefined,
  archiveCc: undefined
}
[2025-11-01T02:33:00.147Z] [AIReceptionist] INFO [PostmarkProvider] Email sent successfully {
  messageId: '509c5376-b9f1-43fa-8f81-def74088eb4b',
  messageIdFormatted: '<509c5376-b9f1-43fa-8f81-def74088eb4b@mtasv.net>',
  to: [ 'kennethatchon@gmail.com' ],
  from: 'AI Receptionist <info@inbound.loctelli.com>',
  subject: 'Re: Inquiry Product',
  cc: undefined,
  inReplyTo: '<7e0df9f4-ecc2-4990-aa26-aee425cdc387@mtasv.net>',
  references: '<7e0df9f4-ecc2-4990-aa26-aee425cdc387@mtasv.net>',
  attachmentCount: 0
}
[Agent] Tool 'send_email' executed
Result: {"messageId":"509c5376-b9f1-43fa-8f81-def74088eb4b"}
[2025-11-01T02:33:00.148Z] [AIReceptionist] INFO [OpenAIProvider] Chat request for conversation: synthesis-1761964380148


