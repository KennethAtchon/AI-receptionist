[Nest] 1  - 11/01/2025, 12:53:12 AM     LOG [SemanticSecurityService] Precomputed 13 attack pattern embeddings
[Nest] 1  - 11/01/2025, 12:53:12 AM     LOG [SemanticSecurityService] Semantic Security Service initialized with attack pattern embeddings
[Nest] 1  - 11/01/2025, 12:53:13 AM     LOG [SalesBotService] Sales Bot Service initialized
[Nest] 1  - 11/01/2025, 12:53:13 AM     LOG [AIReceptionistTestService] Initializing AI Receptionist Test Service...
[2025-11-01T00:53:13.001Z] [AIReceptionist] INFO [AIReceptionist] Initializing agent: Emma
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderRegistry] Registered provider: ai
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderRegistry] Registered provider: postmark
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderInit] Registered email provider: postmark
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderInit] Validating provider credentials...
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderRegistry] Validating 2 provider(s)
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderProxy] Validating ai credential format
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [OpenAIValidator] Format validation passed for openai
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderProxy] Validating ai connection
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderProxy] Lazy loading ai provider
[2025-11-01T00:53:13.002Z] [AIReceptionist] INFO [ProviderProxy] Validating postmark credential format
[2025-11-01T00:53:13.003Z] [AIReceptionist] INFO [PostmarkValidator] Format validation passed
[2025-11-01T00:53:13.003Z] [AIReceptionist] INFO [ProviderProxy] Validating postmark connection
[2025-11-01T00:53:13.003Z] [AIReceptionist] INFO [ProviderProxy] Lazy loading postmark provider
[2025-11-01T00:53:13.003Z] [AIReceptionist] INFO [OpenAIProvider] Initializing with model { model: 'gpt-4o-mini' }
[2025-11-01T00:53:13.006Z] [AIReceptionist] INFO [PostmarkProvider] Initializing (loading SDK)
[2025-11-01T00:53:13.008Z] [AIReceptionist] INFO [ProviderProxy] ai provider loaded successfully
[2025-11-01T00:53:13.009Z] [AIReceptionist] INFO [OpenAIValidator] Testing openai API connection
[2025-11-01T00:53:13.028Z] [AIReceptionist] INFO [PostmarkProvider] SDK loaded
[2025-11-01T00:53:13.028Z] [AIReceptionist] INFO [ProviderProxy] postmark provider loaded successfully
[2025-11-01T00:53:13.028Z] [AIReceptionist] INFO [PostmarkValidator] Testing Postmark API connection
[2025-11-01T00:53:13.238Z] [AIReceptionist] INFO [PostmarkValidator] Connection test passed
[2025-11-01T00:53:13.238Z] [AIReceptionist] INFO [ProviderProxy] postmark credentials validated successfully
[2025-11-01T00:53:13.435Z] [AIReceptionist] INFO [ToolInit] Long-term memory disabled, skipping database tools
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [ToolRegistry] Registered tool: send_email
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [EmailTools] Registered email tools with provider registry
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [ToolInit] Email tools registered
[2025-11-01T00:53:13.433Z] [AIReceptionist] INFO [OpenAIValidator] Connection validation passed for openai
[2025-11-01T00:53:13.433Z] [AIReceptionist] INFO [ProviderProxy] ai credentials validated successfully
[2025-11-01T00:53:13.433Z] [AIReceptionist] INFO [ProviderRegistry] All providers validated successfully
[2025-11-01T00:53:13.433Z] [AIReceptionist] INFO [ProviderInit] All credentials validated successfully
[2025-11-01T00:53:13.433Z] [AIReceptionist] INFO [ToolInit] Tool infrastructure created
Initializing agent
Agent initialized successfully
[2025-11-01T00:53:13.435Z] [AIReceptionist] INFO [ToolInit] No standard tools requested
[2025-11-01T00:53:13.435Z] [AIReceptionist] INFO [ToolInit] No custom tools provided
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [ToolInit] Total tools registered: 1
[2025-11-01T00:53:13.436Z] [AIReceptionist] WARN [EmailAllowlist] No database available for persistence
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [ResourceInit] Resources initialized: voice, sms, email, text
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [AIReceptionist] Initialized successfully
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [AIReceptionist] - Registered providers: ai, postmark
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [AIReceptionist] - Registered tools: 1
[2025-11-01T00:53:13.436Z] [AIReceptionist] INFO [AIReceptionist] - Available channels: voice, sms, email, text
[Nest] 1  - 11/01/2025, 12:53:13 AM     LOG [AIReceptionistTestService] ✅ AI Receptionist Test Service initialized successfully
[Nest] 1  - 11/01/2025, 12:53:13 AM     LOG [NestApplication] Nest application successfully started +3ms
[Nest] 1  - 11/01/2025, 12:53:13 AM     LOG [Bootstrap] ✅ Loctelli Backend Application started successfully on port 8080
[Nest] 1  - 11/01/2025, 12:53:13 AM     LOG [Bootstrap] 📊 Health check available at: http://localhost:8080/status
[Nest] 1  - 11/01/2025, 12:53:13 AM     LOG [Bootstrap] 🔗 API documentation available at: http://localhost:8080/api
[Nest] 1  - 11/01/2025, 12:53:13 AM   DEBUG [JwtAuthGuard] 🔒 Auth guard checking route: GET /ai-receptionist/version
[Nest] 1  - 11/01/2025, 12:53:13 AM   DEBUG [JwtAuthGuard] ✅ Public route allowed: GET /ai-receptionist/version
[Nest] 1  - 11/01/2025, 12:53:17 AM   DEBUG [JwtAuthGuard] 🔒 Auth guard checking route: GET /ai-receptionist/version
[Nest] 1  - 11/01/2025, 12:53:17 AM   DEBUG [JwtAuthGuard] ✅ Public route allowed: GET /ai-receptionist/version
[Nest] 1  - 11/01/2025, 12:54:47 AM   DEBUG [WebhookSecurityMiddleware] ✅ Webhook security passed from IP: 18.217.206.57
[Nest] 1  - 11/01/2025, 12:54:47 AM   DEBUG [JwtAuthGuard] 🔒 Auth guard checking route: POST /ai-receptionist/webhooks/email
[Nest] 1  - 11/01/2025, 12:54:47 AM   DEBUG [JwtAuthGuard] ✅ Public route allowed: POST /ai-receptionist/webhooks/email
[Nest] 1  - 11/01/2025, 12:54:47 AM     LOG [AIReceptionistTestController] Received email webhook
[Nest] 1  - 11/01/2025, 12:54:47 AM   DEBUG [AIReceptionistTestController] {"payload":{"FromName":"Kenneth Atchon","MessageStream":"inbound","From":"kenneth.atchon@hotmail.com","FromFull":{"Email":"kenneth.atchon@hotmail.com","Name":"Kenneth Atchon","MailboxHash":""},"To":"\"AI Receptionist\" <info@inbound.loctelli.com>","ToFull":[{"Email":"info@inbound.loctelli.com","Name":"AI Receptionist","MailboxHash":""}],"Cc":"","CcFull":[],"Bcc":"","BccFull":[],"OriginalRecipient":"info@inbound.loctelli.com","Subject":"Inquiry","MessageID":"50c2377e-e3a2-4a89-9632-94fcfae7cbff","ReplyTo":"","MailboxHash":"","Date":"Sat, 1 Nov 2025 00:54:40 +0000","TextBody":"Hey,\n\nIs this the right email address? What is this email address for exactly?\n\nThanks,\nKenneth","HtmlBody":"<html>\n<head>\n<meta http-equiv=\"Content-Type\" c\"text/html; charset=iso-8859-1\">\n<style type=\"text/css\" style=\"display:none;\"> P {margin-top:0;margin-bottom:0;} </style>\n</head>\n<body dir=\"ltr\">\n<div class=\"elementToProof\">Hey,</div>\n<div class=\"elementToProof\"><br>\n</div>\n<div class=\"elementToProof\">Is this the right email address? What is this email address for exactly?</div>\n<div class=\"elementToProof\"><br>\n</div>\n<div class=\"elementToProof\">Thanks,</div>\n<div class=\"elementToProof\">Kenneth</div>\n</body>\n</html>","StrippedTextReply":"","Tag":"","Headers":[{"Name":"Return-Path","Value":"<kenneth.atchon@hotmail.com>"},{"Name":"Received","Value":"by p-pm-inboundg03c-aws-euwest1c.inbound.postmarkapp.com (Postfix, from userid 996)\tid 20E67405154; Sat,  1 Nov 2025 00:54:47 +0000 (UTC)"},{"Name":"X-Spam-Checker-Version","Value":"SpamAssassin 3.4.0 (2014-02-07) on\tp-pm-inboundg03c-aws-euwest1c"},{"Name":"X-Spam-Status","Value":"No"},{"Name":"X-Spam-Score","Value":"1.1"},{"Name":"X-Spam-Tests","Value":"DKIM_SIGNED,DKIM_VALID,DKIM_VALID_AU,FORGED_HOTMAIL_RCVD2,\tFREEMAIL_FROM,HTML_MESSAGE,RCVD_IN_DNSWL_NONE,RCVD_IN_MSPIKE_H2,\tRCVD_IN_VALIDITY_RPBL_BLOCKED,RCVD_IN_VALIDITY_SAFE_BLOCKED,\tRCVD_IN_ZEN_BLOCKED_OPENDNS,SPF_HELO_PASS,SPF_PASS"},{"Name":"Received-SPF","Value":"pass (hotmail.com: Sender is authorized to use 'kenneth.atchon@hotmail.com' in 'mfrom' identity (mechanism 'include:spf2.outlook.com' matched)) receiver=p-pm-inboundg03c-aws-euwest1c; identity=mailfrom; envelope-from=\"kenneth.atchon@hotmail.com\"; helo=SEYPR02CU001.outbound.protection.outlook.com; client-ip=52.103.74.81"},{"Name":"Received","Value":"from SEYPR02CU001.outbound.protection.outlook.com (mail-koreacentralazolkn19013081.outbound.protection.outlook.com [52.103.74.81])\t(using TLSv1.2 with cipher ECDHE-RSA-AES256-GCM-SHA384 (256/256 bits))\t(No client certificate requested)\tby p-pm-inboundg03c-aws-euwest1c.inbound.postmarkapp.com (Postfix) with ESMTPS id A40E0453CA2\tfor <info@inbound.loctelli.com>; Sat,  1 Nov 2025 00:54:46 +0000 (UTC)"},{"Name":"ARC-Seal","Value":"i=1; a=rsa-sha256; s=arcselector10001; d=microsoft.com; cv=none; b=CGmKZBi282lDXBf/ME74/rLc8X4X3gBjn/6w4q0dTkyAHMSZE5Hrv1ha7sIO3djVFzVUIB8WbSLSf2x0ofV4kN1l3Idaj17a4r+8TYM/iS7N6nM/EXsdc2Lp2bEB4vvaHW0XHc8HQGEOv4bC/Pz//kpJ66p4CCNx31Bv8NluvvTq6/LeE2lvLB3x1dMzh2zCFIHM0lzZFG8PwjDPQPfUI2H8hcrsvjAT9te6AfSIID/0L41ENCeExJHxDwkuF1TN/AQ1BmKfqqj52LnMJzquttrptuP8yS3TQMP57ZR4UmWTf9MYAb2JJFxM5y/feResOTM0QpbVKuA6y3yO/cxsOQ=="},{"Name":"ARC-Message-Signature","Value":"i=1; a=rsa-sha256; c=relaxed/relaxed; d=microsoft.com; s=arcselector10001; h=From:Date:Subject:Message-ID:Content-Type:MIME-Version:X-MS-Exchange-AntiSpam-MessageData-ChunkCount:X-MS-Exchange-AntiSpam-MessageData-0:X-MS-Exchange-AntiSpam-MessageData-1; bh=02IBoz+uzHJfiiseDvXKgNU8Is0g5J7+CLlTpNqzjfo=; b=Ep3U53nNDH4hh8A5xR3I93JCIwh0/ksSALgLI/LmjuR+bYKI+troWcf7rwHke3T94l6tJ7xvysOq3I0hUYAHenQTsWvlqQQCVgDDnvSbJqC44nkavTzB+zKKE2FQfbmLwwqhF8BYlFyTaxgIBR6beBGy7ohJ6IQcEtmOPizcZl9lpcO16om5gu7muXZpggTK7j/wQguusqjP9rs1EMUZS1FpBSkxmNM5oVpa/6ET4zulrYI+U55fQ4jk5PicgpvcHu9+rRnPvEwarn+GfCLRsGH7uDyBxfrJ/5NqMr1c9zGKWHGcPclt/tyR0s8YqesJijWbxCb2NJApdJC44NjOlQ=="},{"Name":"ARC-Authentication-Results","Value":"i=1; mx.microsoft.com 1; spf=none; dmarc=none; dkim=none; arc=none"},{"Name":"DKIM-Signature","Value":"v=1; a=rsa-sha256; c=relaxed/relaxed; d=hotmail.com; s=selector1; h=From:Date:Subject:Message-ID:Content-Type:MIME-Version:X-MS-Exchange-SenderADCheck; bh=02IBoz+uzHJfiiseDvXKgNU8Is0g5J7+CLlTpNqzjfo=; b=WAmz2poeUIwB8uO3+fPIYhcC3wDoKA5G6s1oGF58hd0ki96TkXkz350JbAZsq0TPHMbtis7a5Ui9RFIywhyI5OdBKRgLigWDuATNeeAVVNeB9tSazXH84FfTn7amagxE8N61iLXpecUIINXGo2j9G4XW/3kX5u+p4pCFLOPF1bTxx6hV1SzWNECSiapE38o9pUuGKX0Y9lqFPDCq53WJMVYG84L52WSw3f5QQzHYQ68EUogPthkQKE3tf0ebAsXAtkShdwBmUCNqz96NVfBUB/jYbSLigu6AfAW6pARvLepuLtgxWvFNfnBYU874u3ITLejikbECG2BbzOKGGkWTLg=="},{"Name":"Received","Value":"from SEZPR04MB6729.apcprd04.prod.outlook.com (2603:1096:101:f3::10) by TYZPR04MB6278.apcprd04.prod.outlook.com (2603:1096:400:287::5) with Microsoft SMTP Server (version=TLS1_2, cipher=TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384) id 15.20.9275.13; Sat, 1 Nov 2025 00:54:41 +0000"},{"Name":"Received","Value":"from SEZPR04MB6729.apcprd04.prod.outlook.com ([fe80::8ecd:f067:6b30:c77c]) by SEZPR04MB6729.apcprd04.prod.outlook.com ([fe80::8ecd:f067:6b30:c77c%7]) with mapi id 15.20.9275.013; Sat, 1 Nov 2025 00:54:41 +0000"},{"Name":"Thread-Topic","Value":"Inquiry"},{"Name":"Thread-Index","Value":"AQHcSsoW4wPhDzNTfEW1lpxiou5YuQ=="},{"Name":"Message-ID","Value":"<SEZPR04MB67299B132400CE3C402E021A89F9A@SEZPR04MB6729.apcprd04.prod.outlook.com>"},{"Name":"Accept-Language","Value":"en-US"},{"Name":"X-MS-Has-Attach","Value":""},{"Name":"X-MS-TNEF-Correlator","Value":""},{"Name":"msip_labels","Value":""},{"Name":"x-ms-publictraffictype","Value":"Email"},{"Name":"x-ms-traffictypediagnostic","Value":"SEZPR04MB6729:EE_|TYZPR04MB6278:EE_"},{"Name":"x-ms-office365-filtering-correlation-id","Value":"1d91e6a0-7636-4e30-157b-08de18e13d57"},{"Name":"x-ms-exchange-slblob-mailprops","Value":"mDzISFfNJ+i5fDsglrLUVGdIRzx2kacj/951ecrtLZpc9Aj1S+K30iMvkYHQvYKAQgVE6W2nzOJeY/IPddk4v2X6oQ4YmbiWmZhsyeTRzDqY9EAW4h+oeAjK/puPYnkJeGP5r5gwm6LP4Wm8gCFeshuNEXCTttqVxOaG50wYUh13eb1NSHulSgupokJwkaQZBtI43XNoyH/MRvCTgtlDjGb6bpoBxkKIMRhYN6pDFb6JrKR80xadAiQLFKm9NHnJfe1JZhAKMM1xGq0FTAFfXGr0UsDeCdMDhK/7rQMCwL0A3EZaEtrHYKnepiwDwus9SgIT0t8ToSXel7xRDU3ngO5VurqBd9F8bA6Au6UJlMzLLKHhQNhG4XaE22gv3wS+eaBNnJUzlzip+2XUBf92UZrOBGae9IE4aLLTYTNV8mQsR6ef9SBLMYQ3mzfAmcfea0r8tMhHJGL1yYHRRKtf/OVQaqmsCp+PZV7VzSWlfQTukB3t/drWn6PqIuVbGi3ZIWI96qp4w3a5x1Tk+2r56r7DHB2EHMkna9n1eSI7dfbx8tBZ/Kc3K+Vyv8rNFk9IEkOaq2e85K4="},{"Name":"x-microsoft-antispam","Value":"BCL:0;ARA:14566002|19110799012|15080799012|41001999006|15030799006|8062599012|8060799015|31061999003|461199028|40105399003|440099028|3412199025|102099032;"},{"Name":"x-microsoft-antispam-message-info","Value":"3J9/J3YIwwNkg32mCyTjW0hT0M2pQlUkMVW2336H5uLLovKFSuOwPdgtYG/l6XY9PXHNjE4Nhp4boH6pnwncF7BP/HF7H6v4w4ibnokgodlOo9Lpio/XH3sjh7DjF1RCQr8WrMhb7UfrsJ144k6cCBVfxtHIgA++myoGiS/tKvWxX19kkM0P/0530JleSvBe9l88AhO8tfLv2riNUT2SUgMzQp6WgnTefsRkq7fqznSDiWGaLWSimxXcMROcgSjLOmA01rTRBXUX8Mvyv1JYP1ioLS4N+jIVJgtGLXx0rCH3QlDTB5vbKVEBTlqvvdMXCmCUd1XG4tc5wsS2lUy2nlZQhS5hzH+x7MRod2sXdWusZU2uOjvIngFEMAat4fCPEIQY0HgET4zaBh8RqLqAoSdTMpHcQALF0uYoEYUEgSjIjrOeXex40NnNr24h5mkhnNatXY8XkWecYYnyKPndNvu5bryzNTMWrRs5KBcn4DTN8SdVl5bz+0/PRGv3d6zh2Fz0RLRFp57sXKL3NU10e+A4SS2UTtkFsL/WC7dH3cswwvhT8ansIE2rIc0T0lsv/IhxxC7xMG6qG/NRgXNOOWyPi9+JsWTtoVBl5jMAozL2hKMlpYoA0sEpwga/0mXSuXnXEW1e4L0OCfff2KYgw0TFHrQ45kc34liKaM4KwU+m56hqShqm0VFJRM+62EbYhmFwS2AOUeFqJm75U5LxtVo5bDV+EMw1k8mvgGe4J7NWhrfZ746gXxSDj1MfROxzEQpdnccOwpyp1sBwoFeLNRpUz/ubBaWwOFZgQIMjHpPQnGKbXpePrSXra3N6hZyx/8mNkbk09QiulxsDEZCFEgK2HypdUEYtEkjCcgwmzBX6t1FkF0aNygn/fOWawk2fkOe85WBRZgTNt4lCLz+tx9GIngkq7SLIczcz4YTj6RImkdvi7a0yvj2PChFGyp/m8EzWMHNKkcxJx3wSavHv9Ynf4Wwl3fjqQf3+jir5aCOnzTY2ynTavzkXn4Ho9Uv8kE020++Mc3tCCD+2AOWRnOh2uAR7OafFVitQsjPdPD1EX7NhqDjm+62uF/N04WYLKHtIJhBPlLhVK+ZfSbBSxRh4bliGTxE/NSgjEG6LdUa9DHa76pG3n+uMDAvh2h8qp+B9teo+nXv0qlibFL/FQKeuRK0qvjO5zTLkbMag2CYHCiS460Qhh7zP3sOzA1rV8S1jSVUAOF1YVkLREoyTVQ=="},{"Name":"x-ms-exchange-antispam-messagedata-chunkcount","Value":"1"},{"Name":"x-ms-exchange-antispam-messagedata-0","Value":"sFZEgerqv0rXIACZp7dEm0M8OjhiA4Z7wHLk5HgPRm2jjHHgvgNztFoXhCTRa99IzNDc1OKDYxtqU1n5qP5jc2XdwCAd/4qJ4DVXUN6UYfng9X2WJ2lB1yBUP7V6CePeRY5B3Z9YhurmRsvyg/wXANl+AgnNDre9a4o6TdolAoDNJs9Rbysk43izAp777RLZQqnzlAD6khORUlLT0eM5EOh+Dc+pEmUhSsdNS0wMqqNlQv7sPFz39af8WlARs8G+t52Ms7DzO9OgRSDyV0ejwMN9sHGZ7xGpb5hCC06SLYbFwqO8t3xbYHwmdE0qTren/ylk2tBCkL6NHOYw1EtpJiW1+4Ek025rb0gwdVec3x7pXEyNWpfzC8eJcaI3sIH/5/OVW9ueO+EKufinx4zdZUh4NbFK9j5xebZ+ifYei9WsgwvjqyDL9PmUs2hNL7FAAIdMdfAxzVv3p43cR+bSXfe8+ZvBq73qqL8zFbyYEZkNhhYJuAgV2F8A5+m9+ly5Tz1rZ38Tw0KPHFPkFO8Hg2X1RAgmVAWPTVeJMPkgBB8R6C9TLWML0zxPzBxImS4M+zQb/KTRJO07FZCdZLS+DKMCmeBwPtM3SRMTjG74O7cunwEGdMLuq35oNTjMgY4mpjGmHz4OLq9rlCXd8cQmKrdZSJL3YH4iHBUYznMwu9OcIJ+pNQzj2s+wA8o/QH8RvDGoNGG2cxbEXv26gKO1XqlTRLodRMvmPuy2KKjtSqFIiPSlJjS40FjS5FEl97XHDN1lwuzvAzI1YBUTvaS+csi+oD3MtIDGZO1wd5TEMXctZPjcmv/lte4aYf1ah1WJr6hSJOh4rHBjom1cE3KBn/VLSLRTVysWdx8GO3D1QX0hjzQlQaMtmiwARd4FAffsCbAaDunXXEmV1GsPqhlOJHIRcjvcUKcK4oRI9X4xuaFhNEAEzIBzeq6QWboKBis79h5R0VIhSRISmypt7D4gRi3wNRB8XUFNC6ZkZMzjqwxDDyHCpq5bQ1LzDxCz2nXE8f4uF9oXlI7pz0NX78O/eJgXQQD51i6NArTkt25KeYR+Qvy0D0P1Pi79478kTuvgr41hOgx5HSs38k9n0IpMiuUY/UrWnsWDSb5AjVEzlLsgNBbwJrtkJmC3BKcYsQUPK9t/2YCkJgHBM7/IocqA/WmcBoGyH39fnZfbZU+ZTAvsIyxL3vuHRcI7IbnMqh60N0dS+AIb+sL6JQotzuURQIKA9NEUuiX2kZR+3aKTEIQ="},{"Name":"MIME-Version","Value":"1.0"},{"Name":"X-OriginatorOrg","Value":"sct-15-20-9052-0-msonline-outlook-38779.templateTenant"},{"Name":"X-MS-Exchange-CrossTenant-AuthAs","Value":"Internal"},{"Name":"X-MS-Exchange-CrossTenant-AuthSource","Value":"SEZPR04MB6729.apcprd04.prod.outlook.com"},{"Name":"X-MS-Exchange-CrossTenant-RMS-PersistedConsumerOrg","Value":"00000000-0000-0000-0000-000000000000"},{"Name":"X-MS-Exchange-CrossTenant-Network-Message-Id","Value":"1d91e6a0-7636-4e30-157b-08de18e13d57"},{"Name":"X-MS-Exchange-CrossTenant-originalarrivaltime","Value":"01 Nov 2025 00:54:40.8928 (UTC)"},{"Name":"X-MS-Exchange-CrossTenant-fromentityheader","Value":"Hosted"},{"Name":"X-MS-Exchange-CrossTenant-id","Value":"84df9e7f-e9f6-40af-b435-aaaaaaaaaaaa"},{"Name":"X-MS-Exchange-CrossTenant-rms-persistedconsumerorg","Value":"00000000-0000-0000-0000-000000000000"},{"Name":"X-MS-Exchange-Transport-CrossTenantHeadersStamped","Value":"TYZPR04MB6278"}],"Attachments":[]}}
  attachmentCount: 0,
  fromName: 'Kenneth Atchon',
  messageStream: 'inbound',
[2025-11-01T00:54:47.885Z] [AIReceptionist] INFO [WebhookRouter] Routing email webhook { sessionId: undefined }
[2025-11-01T00:54:47.886Z] [AIReceptionist] INFO [WebhookRouter] Creating session from webhook { type: 'email' }
[2025-11-01T00:54:47.886Z] [AIReceptionist] INFO [SessionManager] Created email session {
  sessionId: 'email_1761958487886_1bfwv0w',
  conversationId: 'conv_1761958487886_ibeke7j',
  identifier: 'kenneth.atchon@hotmail.com'
}
[2025-11-01T00:54:47.886Z] [AIReceptionist] INFO [EmailResource] Handling inbound email webhook
[2025-11-01T00:54:47.887Z] [AIReceptionist] INFO [EmailResource] Creating new conversation for kenneth.atchon@hotmail.com {
  subject: 'Inquiry',
  messageId: '50c2377e-e3a2-4a89-9632-94fcfae7cbff',
  hadInReplyTo: false,
  hadReferences: false
}
[2025-11-01T00:54:47.887Z] [AIReceptionist] INFO [EmailResource] Stored inbound email in conversation conv_1761958487887_65nsqf5 {
  emailId: '50c2377e-e3a2-4a89-9632-94fcfae7cbff',
  threadRoot: '50c2377e-e3a2-4a89-9632-94fcfae7cbff',
  hasReferences: false,
  replyTo: undefined,
  subject: 'Re: Inquiry',
  hasCc: false,
  hasBcc: false
}
[2025-11-01T00:54:47.887Z] [AIReceptionist] INFO [EmailResource] Triggering AI auto-reply for kenneth.atchon@hotmail.com
[2025-11-01T00:54:47.890Z] [AIReceptionist] INFO [OpenAIProvider] Chat request for conversation: conv_1761958487887_65nsqf5
[2025-11-01T00:54:47.890Z] [AIReceptionist] INFO [OpenAIProvider] User message: A customer email was received from kenneth.atchon@hotmail.com with the subject "Inquiry".
      Respond to this customer email.
      Use the send_email tool to send your response.
[2025-11-01T00:54:47.890Z] [AIReceptionist] INFO [OpenAIProvider] Available tools: 1
[Agent] Executing tool 'send_email'
[2025-11-01T00:54:53.028Z] [AIReceptionist] INFO [ToolRegistry] Executing tool 'send_email' on channel 'email'
[2025-11-01T00:54:53.028Z] [AIReceptionist] INFO [SendEmailTool] Sending email via email channel
[2025-11-01T00:54:53.028Z] [AIReceptionist] INFO [PostmarkProvider] Sending email via Postmark {
  to: [ 'kenneth.atchon@hotmail.com' ],
  from: 'AI Receptionist <info@inbound.loctelli.com>',
  cc: undefined,
  hasTextBody: true,
  hasHtmlBody: true,
  textBodyLength: 279,
  htmlBodyLength: 309,
  attachmentCount: 0,
  attachments: undefined,
  headers: {
    'In-Reply-To': '<50c2377e-e3a2-4a89-9632-94fcfae7cbff@inbound.loctelli.com>',
    References: '<50c2377e-e3a2-4a89-9632-94fcfae7cbff@inbound.loctelli.com>'
  },
  tags: undefined,
  archiveCc: undefined
}
[2025-11-01T00:54:53.262Z] [AIReceptionist] INFO [PostmarkProvider] Email sent successfully {
  messageId: '1c428149-e982-47d1-838f-b4130ab4a53a',
  messageIdFormatted: '<1c428149-e982-47d1-838f-b4130ab4a53a@mtasv.net>',
  to: [ 'kenneth.atchon@hotmail.com' ],
  from: 'AI Receptionist <info@inbound.loctelli.com>',
  subject: 'Re: Inquiry',
  cc: undefined,
  inReplyTo: '<50c2377e-e3a2-4a89-9632-94fcfae7cbff@inbound.loctelli.com>',
  references: '<50c2377e-e3a2-4a89-9632-94fcfae7cbff@inbound.loctelli.com>',
  attachmentCount: 0
}
[Agent] Tool 'send_email' executed
[2025-11-01T00:54:53.262Z] [AIReceptionist] INFO [OpenAIProvider] Chat request for conversation: synthesis-1761958493262
[2025-11-01T00:54:53.262Z] [AIReceptionist] INFO [OpenAIProvider] User message: Based on these tool results, provide a natural response to the user:
Tool: send_email
Result: {"messageId":"1c428149-e982-47d1-838f-b4130ab4a53a"}
[2025-11-01T00:54:53.262Z] [AIReceptionist] INFO [OpenAIProvider] Available tools: 0



---  



Email API

This endpoint is solely responsible for sending emails with Postmark through a specific server. Please note that the batch endpoint accepts up to 500 messages per API call, and up to 50 MB payload size, including attachments.
Send a single email Try →
#
post
/email
Request headers
Content-Type 	required

application/json
Accept 	required

application/json
X-Postmark-Server-Token 	required

This request requires server level privileges. This token can be found on the API Tokens tab under your Postmark server.
Example request with curl

curl "https://api.postmarkapp.com/email" \
  -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Postmark-Server-Token: server token" \
  -d '{
  "From": "sender@example.com",
  "To": "receiver@example.com",
  "Subject": "Postmark test",
  "TextBody": "Hello dear Postmark user.",
  "HtmlBody": "<html><body><strong>Hello</strong> dear Postmark user.</body></html>",
  "MessageStream": "outbound"
}'

Body format
From 	string 	required

The sender email address. Must have a registered and confirmed Sender Signature. To include a name, use the format "Full Name <sender@domain.com>". Punctuation in the name would need to be escaped.
To 	string 	required

Recipient email address. Multiple addresses are comma separated. Max 50.
Cc 	string 	

Cc recipient email address. Multiple addresses are comma separated. Max 50.
Bcc 	string 	

Bcc recipient email address. Multiple addresses are comma separated. Max 50.
Subject 	string 	

Email subject
Tag 	string 	

Email tag that allows you to categorize outgoing emails and get detailed statistics. Max characters 1000.
HtmlBody 	string 	required

If no TextBody specified HTML email message
TextBody 	string 	required

If no HtmlBody specified Plain text email message
ReplyTo 	string 	

Reply To override email address. Defaults to the Reply To set in the sender signature. Multiple addresses are comma separated.
Headers 	array 	

List of custom headers to include.
TrackOpens 	boolean 	

Activate open tracking for this email.
TrackLinks 	string 	

Activate link tracking for links in the HTML or Text bodies of this email. Possible options: None HtmlAndText HtmlOnly TextOnly
Metadata 	object 	

Custom metadata key/value pairs.
Attachments 	array 	

List of attachments
MessageStream 	string 	

Set message stream ID that's used for sending. If not provided, message will default to the "outbound" transactional stream.
Example body format

{
  "From": "sender@example.com",
  "To": "receiver@example.com",
  "Cc": "copied@example.com",
  "Bcc": "blind-copied@example.com",
  "Subject": "Test",
  "Tag": "Invitation",
  "HtmlBody": "<b>Hello</b> <img src=\"cid:image.jpg\"/>",
  "TextBody": "Hello",
  "ReplyTo": "reply@example.com",
  "Headers": [
    {
      "Name": "CUSTOM-HEADER",
      "Value": "value"
    }
  ],
  "TrackOpens": true,
  "TrackLinks": "None",
  "Attachments": [
    {
      "Name": "readme.txt",
      "Content": "dGVzdCBjb250ZW50",
      "ContentType": "text/plain"
    },
    {
      "Name": "report.pdf",
      "Content": "dGVzdCBjb250ZW50",
      "ContentType": "application/octet-stream"
    },
    {
      "Name": "image.jpg",
      "ContentID": "cid:image.jpg",
      "Content": "dGVzdCBjb250ZW50",
      "ContentType": "image/jpeg"
    }
  ],
  "Metadata": {
      "color":"blue",
      "client-id":"12345"
   },
  "MessageStream": "outbound"
}

Response
To 	string 	

Recipient email address
SubmittedAt 	string 	

Timestamp
MessageID 	string 	

ID of message
ErrorCode 	integer 	

API Error Codes
Message 	string 	

Response message
Example response

HTTP/1.1 200 OK
Content-Type: application/json

{
	"To": "receiver@example.com",
	"SubmittedAt": "2014-02-17T07:25:01.4178645-05:00",
	"MessageID": "0a129aee-e1cd-480d-b08d-4f48548ff48d",
	"ErrorCode": 0,
	"Message": "OK"
}

Send batch emails Try →
#
post
/email/batch
Request headers
Content-Type 	required

application/json
Accept 	required

application/json
X-Postmark-Server-Token 	required

This request requires server level privileges. This token can be found from the API Tokens tab under your Postmark server.
Example request with curl

curl "https://api.postmarkapp.com/email/batch" \
  -X POST \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Postmark-Server-Token: server token" \
  -d '[
  {
    "From": "sender@example.com",
    "To": "receiver1@example.com",
    "Subject": "Postmark test #1",
    "TextBody": "Hello dear Postmark user.",
    "HtmlBody": "<html><body><strong>Hello</strong> dear Postmark user.</body></html>",
    "MessageStream": "outbound"
  },
  {
    "From": "sender@example.com",
    "To": "receiver2@example.com",
    "Subject": "Postmark test #2",
    "TextBody": "Hello dear Postmark user.",
    "HtmlBody": "<html><body><strong>Hello</strong> dear Postmark user.</body></html>",
    "MessageStream": "outbound"
  }
]'

Body format
From 	string 	required

The sender email address. Must have a registered and confirmed Sender Signature. To include a name, use the format "Full Name <sender@domain.com>". Punctuation in the name would need to be escaped.
To 	string 	required

Recipient email address. Multiple addresses are comma separated. Max 50.
Cc 	string 	

Cc recipient email address. Multiple addresses are comma separated. Max 50.
Bcc 	string 	

Bcc recipient email address. Multiple addresses are comma separated. Max 50.
Subject 	string 	

Email subject
Tag 	string 	

Email tag that allows you to categorize outgoing emails and get detailed statistics. Max characters 1000.
HtmlBody 	string 	

If no TextBody specified HTML email message
TextBody 	string 	

If no HtmlBody specified Plain text email message
ReplyTo 	string 	

Reply To override email address. Defaults to the Reply To set in the sender signature.
Headers 	array 	

List of custom headers to include.
TrackOpens 	boolean 	

Activate open tracking for this email.
TrackLinks 	string 	

Activate link tracking for links in the HTML or Text bodies of this email. Possible options: None HtmlAndText HtmlOnly TextOnly
Metadata 	object 	

Custom metadata key/value pairs.
Attachments 	array 	

List of attachments
MessageStream 	string 	

Set message stream ID that's used for sending. If not provided, message will default to the "outbound" transactional stream.
Example body format

[
  {
    "From": "sender@example.com",
    "To": "receiver1@example.com",
    "Cc": "copied@example.com",
    "Bcc": "blank-copied@example.com",
    "Subject": "Test",
    "Tag": "Invitation",
    "HtmlBody": "<b>Hello</b> <img src=\"cid:image.jpg\"/>",
    "TextBody": "Hello",
    "ReplyTo": "reply@example.com",
    "Headers": [
      {
        "Name": "CUSTOM-HEADER",
        "Value": "value"
      }
    ],
    "TrackOpens": true,
    "TrackLinks": "None",
    "Attachments": [
      {
        "Name": "readme.txt",
        "Content": "dGVzdCBjb250ZW50",
        "ContentType": "text/plain"
      },
      {
        "Name": "report.pdf",
        "Content": "dGVzdCBjb250ZW50",
        "ContentType": "application/octet-stream"
      },
     {
       "Name": "image.jpg",
       "ContentID": "cid:image.jpg",
       "Content": "dGVzdCBjb250ZW50",
       "ContentType": "image/jpeg"
     }
    ],
    "Metadata": {
      "color":"green",
      "client-id":"12345"
   },
    "MessageStream": "outbound"
  },
  {
    "From": "sender@example.com",
    "To": "receiver2@example.com",
    "Cc": "copied@example.com",
    "Bcc": "blank-copied@example.com",
    "Subject": "Test",
    "Tag": "Invitation",
    "HtmlBody": "<b>Hello</b> <img src=\"cid:image.jpg\"/>",
    "TextBody": "Hello",
    "ReplyTo": "reply@example.com",
    "Headers": [
      {
        "Name": "CUSTOM-HEADER",
        "Value": "value"
      }
    ],
    "TrackOpens": true,
    "TrackLinks": "None",
    "Attachments": [
      {
        "Name": "readme.txt",
        "Content": "dGVzdCBjb250ZW50",
        "ContentType": "text/plain"
      },
      {
        "Name": "report.pdf",
        "Content": "dGVzdCBjb250ZW50",
        "ContentType": "application/octet-stream"
      },
     {
       "Name": "image.jpg",
       "ContentID": "cid:image.jpg",
       "Content": "dGVzdCBjb250ZW50",
       "ContentType": "image/jpeg"
     }
    ],
    "Metadata": {
      "color":"blue",
      "client-id":"54321"
   },
    "MessageStream": "outbound"
  }
]

Response

Please note that the /batch endpoint will return a 200-level http status, even when validation for individual messages may fail. Users of these endpoints should check the success and error code for each message in the response from our API (the results are ordered the same as the original messages).
To 	string 	

Recipient email address
SubmittedAt 	string 	

Timestamp
MessageID 	string 	

ID of message
ErrorCode 	integer 	

API Error Codes
Message 	string 	

Response message
Example response

HTTP/1.1 200 OK
Content-Type: application/json

[
  {
    "ErrorCode": 0,
    "Message": "OK",
    "MessageID": "b7bc2f4a-e38e-4336-af7d-e6c392c2f817",
    "SubmittedAt": "2010-11-26T12:01:05.1794748-05:00",
    "To": "receiver1@example.com"
  },
  {
    "ErrorCode": 406,
    "Message": "You tried to send to a recipient that has been marked as inactive. Found inactive addresses: example@example.com. Inactive recipients are ones that have generated a hard bounce, a spam complaint, or a manual suppression. "
  }
]