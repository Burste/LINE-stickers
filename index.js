const request = require('request');
const fs = require('fs');
const unzip = require('unzip2');
const sharp = require('sharp');
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config.json');

const emojis = [
  '😊',
  '🙂',
  '😋',
  '😺',
  '🐶',
  '🐱',
  '🐰',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐮',
  '🐷',
  '🐵',
  '🐧',
  '🐔',
  '🦋',
];

let stopping = 0;
setInterval(() => {
  if (stopping === 0) {
    return;
  }
  if (stopping < Date.now()) {
    process.exit();
  }
  var sec = Math.floor((stopping - Date.now()) / 1000);
  if (sec % 5 === 0) {
    console.log('Stop in ' + Math.floor((stopping - Date.now()) / 1000) + ' seconds');
  }
}, 1000);

const bot1 = new TelegramBot(config.token1, {
  polling: true
});

const bot2 = new TelegramBot(config.token2);

const userCD = {};

bot1.on('message', (msg) => {
  if (userCD[msg.from.id] !== undefined) {
    if (Date.now() - userCD[msg.from.id] <  2 * 1000)
      return;
  }
  userCD[msg.from.id] = Date.now();

  console.log(msg);

  if (msg.sticker !== undefined) {
    var text = '您的使用者編號: <code>' + msg.from.id + '</code>\n';
    if (msg.sticker.set_name !== undefined) {
      text += '貼圖包編號: <code>' + msg.sticker.set_name + '</code>\n';
      text += '貼圖表符: ' + msg.sticker.emoji + ' (<a href="http://telegra.ph/Sticker-emoji-06-03">編輯</a>)\n';
    }
    text += '貼圖大小: <b>' + msg.sticker.width + '</b>x<b>' + msg.sticker.height + '</b>\n';
    bot1.sendMessage(msg.chat.id, text, {
      reply_to_message_id: msg.message_id,
      parse_mode: 'HTML'
    });

    if (msg.sticker.set_name !== undefined) {
      var found = msg.sticker.set_name.match(/^line(\d+)_by_Sean_Bot$/);
      if (found) {
        const lid = found[1];
        const meta = JSON.parse(fs.readFileSync('files/' + lid + '/metadata', 'utf8'));
        bot2.getStickerSet(msg.sticker.set_name)
        .then((set) => {
          if (set.stickers.length !== meta.stickers.length) {
            var text = '<a href="https://t.me/addstickers/' + msg.sticker.set_name + '">這包貼圖</a>怪怪的，要砍掉重練嗎？\n';
            bot1.sendMessage(msg.chat.id, text, {
              reply_to_message_id: msg.message_id,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '當然 砍了他 😈',
                      callback_data: 'remove_' + lid
                    }
                  ]
                ]
              }
            });
          }
        });
      }
    }
    return;
  }

  if (msg.text === undefined)
    return;

  if (msg.text === '/stop') {
    if (config.admins.indexOf(msg.from.id) < 0)
      return;

    var text = '指令生效\n';
    if (stopping === 0) {
      stopping = Date.now() + 60 * 1000;
      text += '已開啟停機模式';
    } else {
      stopping = 0;
      text += '已恢復正常模式';
    }
    bot1.sendMessage(msg.chat.id, text, {
      reply_to_message_id: msg.message_id,
    });
    return;
  }

  if (msg.text == '/start SECRET') {
    var text = '歡迎使用 LINE 貼圖轉換器\n';
    text += '您已啟動完成，直接分享貼圖連結過來，就會自動下載囉~\n\n';
    text += '如有任何疑慮，歡迎至<a href="https://t.me/StickerGroup">貼圖群</a>詢問';

    bot1.sendMessage(msg.chat.id, text, {
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id,
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '探索更多貼圖',
              url: 'https://t.me/StickerGroup'
            }
          ]
        ]
      }
    });
    return;
  }

  if (msg.text == '/start edit_emoji') {
    var text = '這邊有教學喔 :D\n';
    text += 'http://telegra.ph/Sticker-emoji-06-03';

    bot1.sendMessage(msg.chat.id, text, {
      reply_to_message_id: msg.message_id,
    });
    return;
  }

  var found = msg.text.match(/(?:line.me\/(?:S\/sticker|stickershop\/product)\/|\/(?:line|start)[_ ]?)(\d+)/);

  if (!found) {
    if (msg.chat.id < 0)
      return;
    var text = '歡迎使用 LINE 貼圖轉換器\n';
    text += '使用前，請先確定已啟動完成\n';
    text += '本機器人由 <a href="https://t.me/SeanChannel">Sean</a> 提供';

    bot1.sendMessage(msg.chat.id, text, {
      parse_mode: 'HTML',
      reply_to_message_id: msg.message_id,
      disable_web_page_preview: true,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '點我啟動',
              url: 'https://t.me/' + config.botName2 + '?start=sticker_dl_start_' + msg.from.id
            }
          ]
        ]
      }
    });
    return;
  }

  if (msg.from.username === undefined) {
    var text = '請先設定 username 喔 😃';

    bot1.sendMessage(msg.chat.id, text, {
      reply_to_message_id: msg.message_id,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '點我看教學',
              url: 'https://t.me/UNameBot?start=Sean_LINE_bot'
            }
          ]
        ]
      }
    });
    return;
  }

  const lid = found[1];

  if (stopping > 0) {
    var text = '⚠️ 機器人要下班了\n\n';
    text += '機器人已排程重啟，為了維護貼圖包品質，將拒收新請求\n';
    text += '請過 <b>' + Math.floor((stopping - Date.now()) / 1000) + '</b> 秒後再點 /line_' + lid + ' 開始下載\n\n';
    text += '如有造成不便，我也不能怎樣 ¯\\_(ツ)_/¯';

    bot1.sendMessage(msg.chat.id, text, {
      reply_to_message_id: msg.message_id,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '先來去逛街',
              url: 'https://t.me/StickerGroup'
            }
          ]
        ]
      }
    });
    return;
  }

  var text = '準備下載 <a href="https://store.line.me/stickershop/product/' + lid + '/zh-Hant">此貼圖</a>...';
  msg.timestamp = Date.now();
  bot1.sendMessage(msg.chat.id, text, {
    parse_mode: 'HTML',
    reply_to_message_id: msg.message_id,
    disable_web_page_preview: true
  })
  .then((result) => {
    msg.msgId = result.message_id;
    if (!fs.existsSync('files/' + lid)) {
      fs.mkdirSync('files/' + lid);
    }
    if (fs.existsSync('files/' + lid + '/metadata')) {
      const meta = JSON.parse(fs.readFileSync('files/' + lid + '/metadata', 'utf8'));
      meta.error = [];

      if (meta.done !== undefined) {
        if (meta.done.length == meta.stickers.length) {
          text = '<a href="https://t.me/addstickers/' + meta.name + '">' + enHTML(meta.title) + '</a> 已存在';
          bot1.editMessageText(text, {
            chat_id: msg.chat.id,
            message_id: msg.msgId,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '點我安裝',
                    url: 'https://t.me/addstickers/' + meta.name
                  }
                ],
                [
                  {
                    text: '分享給朋友',
                    url: 'https://t.me/share/url?'
                    + '?url=' + encodeURIComponent('https://t.me/addstickers/' + meta.name)
                    + '&text=' + encodeURIComponent(meta.title + '\n\n一起用 @' + config.botName1 + ' 把貼圖搬運來吧~')
                  }
                ]
              ]
            }
          });

          bot2.getStickerSet('line' + lid + '_by_' + config.botName2)
          .then((set) => {
            if (set.stickers.length !== meta.stickers.length) {
              var text = '前次下載失敗，請先試試看<a href="https://t.me/addstickers/' + meta.name + '">這包貼圖</a>\n';
              text += '如有問題，就砍掉重練吧 :D\n';
              bot1.editMessageText(text, {
                chat_id: msg.chat.id,
                message_id: msg.msgId,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '砍掉重練 😈',
                        callback_data: 'remove_' + lid
                      }
                    ]
                  ]
                }
              });
            }
          });
          return;
        }

        var stat1 = fs.statSync('files/' + lid);
        var stat2 = fs.statSync('files/' + lid + '/metadata');
        var mtime = Math.max(stat1.mtimeMs, stat2.mtimeMs);
        var sec = Math.floor((mtime - Date.now()) / 1000) + 60;
        if (sec > 0) {
          var text = '已中斷下載\n'
          text += '可能原因: 他人正在下載同款貼圖包\n';
          if (meta.done != undefined) {
            text += prog(meta.done.length, meta.stickers.length);
          }
          text += '\n冷卻時間: <b>' + sec + '</b> 秒\n';
          text += '點擊 /line_' + lid + ' 指令重試\n';
          bot1.editMessageText(text, {
            chat_id: msg.chat.id,
            message_id: msg.msgId,
            parse_mode: 'HTML'
          });
          return;
        }

        var text = '路邊撿到半包貼圖，接續上傳 💪\n';
        if (meta.done.length > 0) {
          text += prog(meta.done.length, meta.stickers.length);
          if (meta.done.length / meta.stickers.length >= 0.7) {
            text += '預覽連結: <a href="https://t.me/addstickers/' + meta.name + '">' + enHTML(meta.title) + '</a>\n';
          }
        }
        bot1.editMessageText(text, {
          chat_id: msg.chat.id,
          message_id: msg.msgId,
          parse_mode: 'HTML'
        });
        uploadBody(msg, lid);
        return;
      }
    }

  var zipname = 'files/' + lid + '/file.zip';
  var req = request('http://dl.stickershop.line.naver.jp/products/0/0/1/' + lid + '/iphone/stickers@2x.zip')
  .on('error', function (err) {
    msg.timestamp = Date.now() + 9487 * 1000;
    var text = '發生錯誤，已中斷下載\n';
    text += '詳細報告: NodeJS <b>request</b> onError\n';
    text += '<pre>' + enHTML(JSON.stringify(err)) + '</pre>';
    bot1.editMessageText(text, {
      chat_id: msg.chat.id,
      message_id: msg.msgId,
      parse_mode: 'HTML'
    });
  })
  .pipe(fs.createWriteStream(zipname))
  .on('finish', function (fin) {
    if (msg.timestamp > Date.now())
      return;

    var zipStat = fs.statSync(zipname);
    if (zipStat.size < 69) {
      var zipText = fs.readFileSync(zipname);
      msg.timestamp = Date.now() + 9487 * 1000;
      var text = '發生錯誤，已中斷下載\n';
      text += '詳細報告: LINE 伺服器提供檔案不正常\n';
      text += '下載內容:\n'
      text += '<pre>' + enHTML(zipText) + '</pre>';
      bot1.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.msgId,
        parse_mode: 'HTML'
      });
      return;
    }

    fs.createReadStream(zipname)
    .pipe(unzip.Parse())
    .on('entry', function (entry) {
      var fileName = entry.path;

      if (fileName == 'productInfo.meta') {
        entry.pipe(fs.createWriteStream('files/' + lid + '/metadata'));
        return;
      }

      if (/\d+@2x.png/.test(fileName)) {
        entry.pipe(fs.createWriteStream('files/' + lid + '/origin-' + fileName.replace('@2x', '')));
        return;
      }

      if (/(\d+_key|tab_(on|off))@2x.png/.test(fileName)) {
        entry.autodrain();
        return;
      }

      entry.pipe(fs.createWriteStream('files/' + lid + '/UNKNOWN-' + fileName));
    })
    .on('finish', function () {
        const meta = JSON.parse(fs.readFileSync('files/' + lid + '/metadata', 'utf8'));
        meta.error = [];

        meta.name = 'line' + lid + '_by_' + config.botName2;

        const langs = [
          'zh-Hant',
          'ja',
          'zh-Hans',
          'en',
          'ko'
        ];
        langs.some(function (val) {
          if (meta['title'][val] !== undefined) {
            meta['lang'] = val;
            return true;
          }
        });
        meta.origin_title = meta.title;
        meta.title = meta['title'][meta.lang];
        meta.emoji = emojis[Math.floor(Math.random() * emojis.length)];

        var text = '已取得 <a href="https://store.line.me/stickershop/product/' + lid + '/' + meta['lang'] + '">' + enHTML(meta.title) + '</a> 資訊...\n';
        bot1.editMessageText(text, {
          chat_id: msg.chat.id,
          message_id: msg.msgId,
          parse_mode: 'HTML'
        });

        const sid = meta.stickers[0].id;
        const origin = 'files/' + lid + '/origin-' + sid + '.png';
        const sticker = 'files/' + lid + '/sticker-' + sid + '.png';

        sharp(origin)
        .resize(512, 512)
        .max()
        .toFile(sticker)
        .catch((error) => {
          console.error(error);
          msg.timestamp = Date.now() + 9487 * 1000;
          meta.error.push(sid);
          var text = '發生錯誤，已中斷下載\n';
          text += '問題來源: NodeJS <b>sharp</b> (圖片轉檔工具)\n';
          text += '詳細報告: \n';
          text += '<pre>' + enHTML(JSON.stringify(error)) + '</pre>';
          bot1.editMessageText(text, {
            chat_id: msg.chat.id,
            message_id: msg.msgId,
            parse_mode: 'HTML'
          });
        })
        .then((data) => {
          if (msg.timestamp > Date.now())
            return;
          bot2.createNewStickerSet(msg.from.id, meta.name, meta.title + "  @SeanChannel", sticker, meta.emoji)
          .catch((error) => {
            msg.timestamp = Date.now() + 9487 * 1000;
            meta.error.push(sid);

            if (error.message.includes('sticker set name is already occupied')) {
              var text = '前次下載失敗，請先試試看<a href="https://t.me/addstickers/' + meta.name + '">這包貼圖</a>，如有問題，就砍掉重練吧 :D\n';
              bot1.editMessageText(text, {
                chat_id: msg.chat.id,
                message_id: msg.msgId,
                parse_mode: 'HTML',
                reply_markup: {
                  inline_keyboard: [
                    [
                      {
                        text: '砍掉重練 😈',
                        callback_data: 'remove_' + lid
                      }
                    ]
                  ]
                }
              });
              return;
            }

            var text = '發生錯誤，已中斷下載\n';
            if (error.message.includes('sticker set name is already occupied')) {
              text += '前次下載失敗，請先試試看<a href="https://t.me/addstickers/' + meta.name + '">這包貼圖，如有問題，就砍掉重練吧 :D\n'
            } else if (error.message.includes('user not found')) {
              text += '請確定 <a href="https://t.me/' + config.botName2 + '">已於此啟動過機器人</a>\n';
            }
            text += '詳細報告: createNewStickerSet\n';
            text += '<pre>' + enHTML(JSON.stringify(error)) + '</pre>';
            bot1.editMessageText(text, {
              chat_id: msg.chat.id,
              message_id: msg.msgId,
              disable_web_page_preview: true,
              parse_mode: 'HTML'
            });
          })
          .then((result) => {
            if (msg.timestamp > Date.now())
              return;
            if (meta.error.indexOf(sid) < 0) {
              meta.done = [ sid ];
              fs.writeFileSync('files/' + lid + '/metadata', JSON.stringify(meta));
              var text = '上傳 <a href="https://store.line.me/stickershop/product/' + lid + '/' + meta['lang'] + '">' + enHTML(meta.title) + '</a> 中...\n';
              text += prog(meta.done.length, meta.stickers.length);
              bot1.editMessageText(text, {
                chat_id: msg.chat.id,
                message_id: msg.msgId,
                parse_mode: 'HTML'
              });
              uploadBody(msg, lid);
            }
            fs.appendFile('files/' + lid + '/request', JSON.stringify(msg), (error) => { console.error(error) });
          });
        });
      });
    });
  });
});

function uploadBody(msg, lid) {
  const meta = JSON.parse(fs.readFileSync('files/' + lid + '/metadata', 'utf8'));
  if (meta.emoji === undefined) {
    meta.emoji = emojis[0];
  }
  meta.error = [];

  for (let i = 0; i < meta.stickers.length; i++) {
    const sid = meta.stickers[i].id;
    if (meta.done.indexOf(sid) > -1)
      continue;

    const origin = 'files/' + lid + '/origin-' + sid + '.png';
    const sticker = 'files/' + lid + '/sticker-' + sid + '.png';

    sharp(origin)
    .resize(512, 512)
    .max()
    .toFile(sticker)
    .catch((error) => {
      console.error(error);
      msg.timestamp = Date.now() + 9487 * 1000;
      meta.error.push(sid);
      var text = '發生錯誤，已中斷下載\n';
      text += '問題來源: NodeJS <b>sharp</b> (圖片轉檔工具)\n';
      text += '詳細報告: \n';
      text += '<pre>' + enHTML(JSON.stringify(error)) + '</pre>';
      bot1.editMessageText(text, {
        chat_id: msg.chat.id,
        message_id: msg.msgId,
        parse_mode: 'HTML'
      });
    })
    .then((data) => {
      bot2.addStickerToSet(msg.from.id, meta.name, sticker, meta.emoji)
      .catch((error) => {
        meta.error.push(sid);
        if (Date.now() < msg.timestamp)
          return;
        msg.timestamp = Date.now() + 9487 * 1000;
        var text = '發生錯誤，請五分鐘後再試\n';
        if (error.message.includes('user not found')) {
          text += '請確定 <a href="https://t.me/' + config.botName2 + '">已於此啟動過機器人</a>\n';
          text += '點擊 /line_' + lid + ' 重試\n';
        } else if (error.message.includes('retry after')) {
          text += '上傳速度太快啦，TG 伺服器要冷卻一下\n';
          text += '點擊 /line_' + lid + ' 重試\n';
        } else if (error.message.includes('STICKERS_TOO_MUCH')) {
          text += '貼圖數量衝破天際啦~\n';
        }
        text += prog(meta.done.length, meta.stickers.length);
        text += '貼圖包連結: <a href="https://t.me/addstickers/' + meta.name + '">' + enHTML(meta.title) + '</a>\n';
        text += '詳細報告: addStickerToSet\n';
        text += '<pre>' + enHTML(JSON.stringify(error)) + '</pre>';
        bot1.editMessageText(text, {
          chat_id: msg.chat.id,
          message_id: msg.msgId,
          parse_mode: 'HTML'
        });
      })
      .then((result) => {
        if (meta.error.indexOf(sid) > -1)
          return;

        meta.done.push(sid);

        if (Date.now() < msg.timestamp)
          return;

        if (meta.done.length == meta.stickers.length) {
          var text = '上傳完成!\n';
          text += '共 <b>' + meta.stickers.length + '</b> 張貼圖\n';
          text += '安裝連結: <a href="https://t.me/addstickers/' + meta.name + '">' + enHTML(meta.title) + '</a>\n';
          if (meta.stickerResourceType !== undefined && meta.stickerResourceType !== 'STATIC') {
            text += 'PS. 移植後，動態/有聲貼圖將僅保留圖片';
          }
          bot1.editMessageText(text, {
            chat_id: msg.chat.id,
            message_id: msg.msgId,
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '點我安裝',
                    url: 'https://t.me/addstickers/' + meta.name
                  },
                  {
                    text: '編輯表符',
                    callback_data: 'done_edit_emoji_' + meta.name
                  }
                ],
                [
                  {
                    text: '分享給朋友',
                    url: 'https://t.me/share/url'
                    + '?url=' + encodeURIComponent('https://t.me/addstickers/' + meta.name)
                    + '&text=' + encodeURIComponent(meta.title + '\n剛出爐的呦~')
                  }
                ]
              ]
            }
          });
        } else if (Date.now() - msg.timestamp > 3 * 1000) {
          msg.timestamp = Date.now();
          var text = '上傳 <a href="https://store.line.me/stickershop/product/' + lid + '/' + meta['lang'] + '">' + enHTML(meta.title) + '</a> 中...\n';
          text += prog(meta.done.length, meta.stickers.length);
          if (meta.done.length / meta.stickers.length >= 0.7) {
            text += '預覽連結: <a href="https://t.me/addstickers/' + meta.name + '">' + enHTML(meta.title) + '</a>\n';
          }
          bot1.editMessageText(text, {
            chat_id: msg.chat.id,
            message_id: msg.msgId,
            parse_mode: 'HTML'
          });
        }
      })
      .finally(() => {
        fs.writeFile('files/' + lid + '/metadata', JSON.stringify(meta), (error) => { if (error) console.error(error) });
      });
    });
  }
}


bot1.on('callback_query', (query) => {
  if (userCD[query.from.id] !== undefined) {
    if (Date.now() - userCD[query.from.id] <  2 * 1000)
      return;
  }
  userCD[query.from.id] = Date.now();

  if (query.data.startsWith('remove_')) {
    lid = query.data.substr(7);

    const meta = JSON.parse(fs.readFileSync('files/' + lid + '/metadata', 'utf8'));
    meta.name = 'line' + lid + '_by_' + config.botName2;
    fs.writeFile('files/' + lid + '/metadata', JSON.stringify(meta), (error) => { if (error) console.error(error) });  // Prevent collision

    bot2.getStickerSet('line' + lid + '_by_' + config.botName2)
    .then((set) => {
      if (meta.done !== undefined) {
        var text = '';

        var stat1 = fs.statSync('files/' + lid);
        var stat2 = fs.statSync('files/' + lid + '/metadata');
        if (Date.now() - stat1.mtimeMs < 1 * 60 * 1000
         || Date.now() - stat2.mtimeMs < 1 * 60 * 1000) {
          text = '冷卻中，請三分鐘後再點一次';
        }

        if (meta.stickers.length !== meta.done.length
                || meta.stickers.length === set.stickers.length) {
          text = '看起來沒問題呀\n如真的怪怪的，請至群組提出'
        }

        if (config.admins.indexOf(query.from.id) > -1) {
          text = '';
        }

        if (text !== '') {
          bot1.answerCallbackQuery(query.id, {
            text: text,
            show_alert: 'true'
          });
          return;
        }
      }

      console.warn(query);

      if (meta.origin_title === undefined) {
        const langs = [
          'zh-Hant',
          'ja',
          'zh-Hans',
          'en',
          'ko'
        ];
        langs.some(function (val) {
          if (meta['title'][val] !== undefined) {
            meta['lang'] = val;
            return true;
          }
        });
        meta.origin_title = meta.title;
        meta.title = set.title.replace(/ +@SeanChannel/, '');
      }
      if (meta.emoji === undefined) {
        meta.emoji = emojis[Math.floor(Math.random() * emojis.length)];
      }
      meta.done = [];

      for (var i=0; i<set.stickers.length; i++) {
        console.log('Removing...', set.stickers[i].file_id);
        bot2.deleteStickerFromSet(set.stickers[i].file_id);
      }

      if (!query.message.text.includes('已清空')) {
        var text = '已清空 <a href="https://t.me/addstickers/' + meta.name + '">' + meta.title + '</a>\n';
        text += '確認顯示「找不到貼圖包」後，請等待三分鐘，並點擊 /line_' + lid + ' 重新下載指令';
        bot1.editMessageText(text, {
          chat_id: query.message.chat.id,
          message_id: query.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '他不是空的 😰',
                  callback_data: 'remove_' + lid
                }
              ]
            ]
          }
        });
      }

      fs.writeFile('files/' + lid + '/metadata', JSON.stringify(meta), (error) => { if (error) console.error(error) });

      bot1.answerCallbackQuery(query.id, {
        text: '處理完成 👌',
        show_alert: 'true'
      });
    });
  }

  if (query.data.startsWith('done_edit_emoji_')) {
    var text = '這邊有教學喔 :D\n';
    text += 'http://telegra.ph/Sticker-emoji-06-03';

    bot1.sendMessage(msg.chat.id, text, {
      reply_to_message_id: query.message.message_id
    });

    bot1.answerCallbackQuery(query.id, {
      text: '您的貼圖編號: ' + query.data.substr(16),
      show_alert: 'true'
    });
  }
});


function enHTML(str) {
  var s = str + '';
  return s.replace('&', '&amp;')
  .replace('"', '&quot;')
  .replace('<', '&lt;')
  .replace('>', '&gt;');
}

function prog(current, total) {
  if (current > total) {
    current = total;
  }
  const count = 20;
  var str = '下載進度: <b>' + current + '</b>/' + total + '  <code>[';
  str += '█'.repeat(Math.round(current * count / total))
  str += '-'.repeat(count - Math.round(current * count / total))
  str += ']</code>\n'
  return str;
}
