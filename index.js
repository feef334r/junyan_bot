const fs = require('fs'),
    junFile = fs.readFileSync('./jun.txt', 'utf-8'), // line-separated, LF, UTF-8 w/o BOM
    Telegraf = require('telegraf'),
    markdown = require('telegraf/extra').markdown();

require('dotenv').config();

let bot;

{
    let agent;
    if (process.env.SOCKS_HOST.length) {
        const SocksAgent = require('socks5-https-client/lib/Agent');
        agent = new SocksAgent({
            socksHost: process.env.SOCKS_HOST,
            socksPort: process.env.SOCKS_PORT
        });
    }

    bot = new Telegraf(process.env.BOT_TOKEN, {
        telegram: agent ? { agent } : void 0,
        username: 'junyan_bot'
    });
}


// Jun filter
const jun = junFile.split('\n')
    .filter(line => line.length > 1)
    .filter( line => !/^#/.test(line) ); // support for comments

// Helpers
const random = jun => {
    const story = jun[Math.floor(Math.random() * jun.length)];
    return story; // TODO
};

const sleep = ms => new Promise( resolve => setTimeout(resolve, ms));

const triggers = new Map([
    // regex or regex array (OR), words, probability?
    [/大新闻/g, '所有人一律不得接受媒体采访！', 0.4],
    [/工人/g, '不要突出资本主义那些矛盾！', 0.1],
    [/怎么又(是|来)/g, '若是发现学生意见很大或发表言论，请收集信息截屏私发给我们。', 0.35],
    [/举报/g, '统一上报领导处理！', 0.6]
]);

(async() => {
    // get EGY sticker set
    let stickerSet, lastUpdate = 0;
    async function getStickerSet({ telegram }) {
        if (Date.now() - lastUpdate > 20 * 60 * 1000) {
            // update
            stickerSet = await telegram.getStickerSet('DashanEGY');
            lastUpdate = Date.now();
        }

        return stickerSet;
    }
    const junHandler = ctx => {
        ctx.telegram.sendMessage(ctx.message.chat.id, random(jun), {
            reply_to_message_id: ctx.message.message_id
        })
    };

    const dissHandler = async ctx => {
        let { stickers } = await getStickerSet(ctx);

        ctx.telegram.sendSticker(ctx.message.chat.id, stickers[Math.floor(Math.random() * stickers.length)].file_id, {
            // reply_to_message_id: ctx.message.reply_to_message ? ctx.message.reply_to_message.message_id : ctx.message.message_id
        })
    };

    bot.start((ctx) => ctx.reply('我是*俊*言*俊*语bot，欢迎来为语录库添砖加瓦。开源地址： [GitHub](https://github.com/feef334r/junyan_bot)', markdown));
    bot.command('waimai', junHandler);
    bot.command('waimai@junyan_bot', junHandler);
    bot.command('diss', dissHandler);
    bot.command('diss@junyan_bot', dissHandler);

    // Easter EGG
    for (const [trigger, word, p = 0.7] of triggers) {
        bot.hears(trigger, async ctx => {
            const r = Math.random();
            if (r <= p) {
                await sleep(Math.round(1200 + Math.random() * 300));
                ctx.telegram.sendMessage(ctx.message.chat.id, word, {
                    reply_to_message_id: ctx.message.message_id
                })
            }
        });
    }

    bot.launch();

    console.log('Bot Running');
})();
