// ---------- Insert Your Data ---------- //

const BOT_TOKEN = "09814685583:AAH_nJs7-OKiFuHkYedfhrQV5LjkCB5g";
const BOT_WEBHOOK = "/endpoint";
const BOT_SECRET = "BOT_SECRET";
const BOT_OWNER = 0064350805;
const BOT_CHANNEL = -10020358474134;
const SIA_NUMBER = 1234;

// ----------Ohh Bhai Do Not Modify ---------- //

const WHITE_METHODS = ["GET", "POST", "HEAD"];
const HEADERS_FILE = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type"};
const HEADERS_ERRR = {'Access-Control-Allow-Origin': '*', 'content-type': 'application/json'};
const ERROR_404 = {"ok":false,"error_code":404,"description":"Bad Request: missing /?file= parameter"};
const ERROR_405 = {"ok":false,"error_code":405,"description":"Bad Request: method not allowed"};
const ERROR_406 = {"ok":false,"error_code":406,"description":"Bad Request: file type invalid"};
const ERROR_407 = {"ok":false,"error_code":407,"description":"Bad Request: file hash invalid by atob"};
const ERROR_408 = {"ok":false,"error_code":408,"description":"Bad Request: mode not in [attachment, inline]"};

// ---------- Event Listener ---------- //

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event));
});

async function handleRequest(event) {
    const url = new URL(event.request.url);
    const file = url.searchParams.get('file');
    const mode = url.searchParams.get('mode') || "attachment";

    if (url.pathname === BOT_WEBHOOK) {return handleWebhook(event);}
    if (url.pathname === '/registerWebhook') {return registerWebhook(event, url, BOT_WEBHOOK, BOT_SECRET);}
    if (url.pathname === '/unregisterWebhook') {return unregisterWebhook(event);}
    if (url.pathname === '/getMe') {return new Response(JSON.stringify(await getMe()), {headers: HEADERS_ERRR, status: 202});}

    if (!file) {return Raise(ERROR_404, 404);}
    if (!["attachment", "inline"].includes(mode)) {return Raise(ERROR_408, 404);}
    if (!WHITE_METHODS.includes(event.request.method)) {return Raise(ERROR_405, 405);}
    try {atob(file);} catch {return Raise(ERROR_407, 404);}

    const file_path = atob(file);
    const channel_id = parseInt(file_path.split('/')[0]) / -SIA_NUMBER;
    const file_id = parseInt(file_path.split('/')[1]) / SIA_NUMBER;
    const retrieve = await RetrieveFile(channel_id, file_id);
    if (retrieve.error_code) {return await Raise(retrieve, retrieve.error_code);}

    const rdata = retrieve[0];
    const rname = retrieve[1];
    const rsize = retrieve[2];
    const rtype = retrieve[3];

    return new Response(rdata, {
        status: 200, headers: {
            "Content-Disposition": `${mode}; filename=${rname}`,
            "Content-Length": rsize,
            "Content-Type": rtype,
            ...HEADERS_FILE
        }
    });
}

// ---------- Retrieve File ---------- //

async function RetrieveFile(channel_id, message_id) {
    let fID, fName, fType, fSize, fLen;

    let data = await editMessage(channel_id, message_id, await UUID());
    if (data.error_code) {return data;}

    if (data.document) {
        fLen = data.document.length - 1;
        fID = data.document.file_id;
        fName = data.document.file_name;
        fType = data.document.mime_type;
        fSize = data.document.file_size;
    } else if (data.audio) {
        fLen = data.audio.length - 1;
        fID = data.audio.file_id;
        fName = data.audio.file_name;
        fType = data.audio.mime_type;
        fSize = data.audio.file_size;
    } else if (data.video) {
        fLen = data.video.length - 1;
        fID = data.video.file_id;
        fName = data.video.file_name;
        fType = data.video.mime_type;
        fSize = data.video.file_size;
    } else if (data.photo) {
        fLen = data.photo.length - 1;
        fID = data.photo[fLen].file_id;
        fName = data.photo[fLen].file_unique_id + '.jpg';
        fType = "image/jpg";
        fSize = data.photo[fLen].file_size;
    } else {
        return ERROR_406;
    }

    const file = await getFile(fID);
    if (file.error_code) {return file;}

    return [await fetchFile(file.file_path), fName, fSize, fType];
}

// ---------- Raise Error ---------- //

async function Raise(json_error, status_code) {
    return new Response(JSON.stringify(json_error), { headers: HEADERS_ERRR, status: status_code });
}

// ---------- UUID Generator ---------- //

async function UUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ---------- Telegram Webhook ---------- //

async function handleWebhook(event) {
    if (event.request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== BOT_SECRET) {
        return new Response('Unauthorized', { status: 403 });
    }
    const update = await event.request.json();
    event.waitUntil(onUpdate(event, update));
    return new Response('Ok');
}

async function registerWebhook(event, requestUrl, suffix, secret) {
    const webhookUrl = `${requestUrl.protocol}//${requestUrl.hostname}${suffix}`;
    const response = await fetch(apiUrl('setWebhook', { url: webhookUrl, secret_token: secret }));
    return new Response(JSON.stringify(await response.json()), {headers: HEADERS_ERRR});
}

async function unregisterWebhook(event) { 
    const response = await fetch(apiUrl('setWebhook', { url: '' }));
    return new Response(JSON.stringify(await response.json()), {headers: HEADERS_ERRR});
}

// ---------- Telegram API ---------- //

async function getMe() {
    const response = await fetch(apiUrl('getMe'));
    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function sendMessage(chat_id, reply_id, text) {
    const response = await fetch(apiUrl('sendMessage', {chat_id, reply_to_message_id: reply_id, parse_mode: 'markdown', text}));
    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function sendMessageWithButtons(chat_id, reply_id, text, reply_markup) {
    const response = await fetch(apiUrl('sendMessage', {
        chat_id,
        reply_to_message_id: reply_id,
        parse_mode: 'markdown',
        text,
        reply_markup: JSON.stringify(reply_markup)
    }));

    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function sendDocument(chat_id, file_id) {
    const response = await fetch(apiUrl('sendDocument', {chat_id, document: file_id}));
    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function sendPhoto(chat_id, file_id) {
    const response = await fetch(apiUrl('sendPhoto', {chat_id, photo: file_id}));
    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function editMessage(channel_id, message_id, caption_text) {
    const response = await fetch(apiUrl('editMessageCaption', {chat_id: channel_id, message_id, caption: caption_text}));
    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function getFile(file_id) {
    const response = await fetch(apiUrl('getFile', {file_id}));
    if (response.status == 200) {return (await response.json()).result;}
    else {return await response.json();}
}

async function fetchFile(file_path) {
    const file = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${file_path}`);
    return await file.arrayBuffer();
}

function apiUrl(methodName, params = null) {
    let query = '';
    if (params) {query = '?' + new URLSearchParams(params).toString();}
    return `https://api.telegram.org/bot${BOT_TOKEN}/${methodName}${query}`;
}

// ---------- Main Message Handler ---------- //

async function onUpdate(event, update) {
    if (update.message) {await onMessage(event, update.message);}
}

async function onMessage(event, message) {
    let fID, fName, fSave, fType, fSize;
    let url = new URL(event.request.url);
    let bot = await getMe();

    if (message.chat.id.toString().includes("-100")) return;

    // ---------- /start HASH ---------- //

    if (message.text && message.text.startsWith("/start ")) {
        const file = message.text.split("/start ")[1];
        try { atob(file); } catch {
            return await sendMessage(message.chat.id, message.message_id, ERROR_407.description);
        }

        const file_path = atob(file);
        const channel_id = parseInt(file_path.split('/')[0]) / -SIA_NUMBER;
        const message_id = parseInt(file_path.split('/')[1]) / SIA_NUMBER;
        const data = await editMessage(channel_id, message_id, await UUID());

        if (data.document) {
            fID = data.document.file_id;
            fSize = data.document.file_size;
        } else if (data.audio) {
            fID = data.audio.file_id;
            fSize = data.audio.file_size;
        } else if (data.video) {
            fID = data.video.file_id;
            fSize = data.video.file_size;
        } else if (data.photo) {
            const last = data.photo[data.photo.length - 1];
            fID = last.file_id;
            fSize = last.file_size;
        } else {
            return sendMessage(message.chat.id, message.message_id, "Bad Request: File not found");
        }

        const final_hash = (btoa(channel_id * -SIA_NUMBER + "/" + message_id * SIA_NUMBER)).replace(/=/g, "");
        const final_link = `${url.origin}/?file=${final_hash}`;
        const final_stre = `${url.origin}/?file=${final_hash}&mode=inline`;

        if (fSize <= 50 * 1024 * 1024) {
            return await sendDocument(message.chat.id, fID);
        }

        return sendMessage(
            message.chat.id,
            message.message_id,
            `📦 File is too big for Telegram bots.\n\n⬇ Download:\n${final_link}\n\n▶ Stream:\n${final_stre}`
        );
    }

    // ---------- Owner Only ---------- //

    if (message.chat.id != BOT_OWNER) {
        return sendMessage(message.chat.id, message.message_id, "Access forbidden.");
    }

    if (message.document) {
        fID = message.document.file_id;
        fName = message.document.file_name;
        fType = message.document.mime_type.split("/")[0];
        fSize = message.document.file_size;
        fSave = await sendDocument(BOT_CHANNEL, fID);

    } else if (message.audio) {
        fID = message.audio.file_id;
        fName = message.audio.file_name;
        fType = message.audio.mime_type.split("/")[0];
        fSize = message.audio.file_size;
        fSave = await sendDocument(BOT_CHANNEL, fID);

    } else if (message.video) {
        fID = message.video.file_id;
        fName = message.video.file_name;
        fType = message.video.mime_type.split("/")[0];
        fSize = message.video.file_size;
        fSave = await sendDocument(BOT_CHANNEL, fID);

    } else if (message.photo) {
        const last = message.photo[message.photo.length - 1];
        fID = last.file_id;
        fName = last.file_unique_id + '.jpg';
        fType = "image";
        fSize = last.file_size;
        fSave = await sendPhoto(BOT_CHANNEL, fID);

    } else {
        return sendMessage(message.chat.id, message.message_id, "⚡️ Send me any file/video/gif/audio");
    }

    if (fSave.error_code) {
        return sendMessage(message.chat.id, message.message_id, fSave.description);
    }

    const final_hash = (btoa(fSave.chat.id * -SIA_NUMBER + "/" + fSave.message_id * SIA_NUMBER)).replace(/=/g, "");
    const final_link = `${url.origin}/?file=${final_hash}`;
    const final_stre = `${url.origin}/?file=${final_hash}&mode=inline`;
    const final_tele = `https://t.me/${bot.username}/?start=${final_hash}`;

    const inlineKeyboard = {
        inline_keyboard: [
            [
                { text: "Telegram Link", url: final_tele },
                { text: "Download Link", url: final_link }
            ],
            [
                { text: "Stream Link", url: final_stre }
            ]
        ]
    };

    let final_text = `*📁 File Name:* \`${fName}\`\n*⚙️ File Hash:* \`${final_hash}\`\n`;

    return sendMessageWithButtons(message.chat.id, message.message_id, final_text, inlineKeyboard);
        }
