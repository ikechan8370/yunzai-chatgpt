import fastify from 'fastify'
import fastifyCookie from 'fastify-cookie'
import cors from '@fastify/cors'
import fstatic from '@fastify/static'

import fs from 'fs'
import path from 'path'
import os from 'os'
import osUtils from 'os-utils'
import schedule from 'node-schedule'

import { Config } from '../utils/config.js'
import { randomString, getPublicIP } from '../utils/common.js'

const __dirname = path.resolve()
const server = fastify({
  logger: Config.debug
})

let usertoken = ''
let Statistics = {
  SystemAccess: {
    count: 0,
    oldCount: 0
  },
  CacheFile: {
    count: 0,
    oldCount: 0
  },
  WebAccess: {
    count: 0,
    oldCount: 0
  },
  SystemLoad: {
    count: 0,
    oldCount: 0
  }
}

async function getLoad() {
  // 获取当前操作系统平台
  const platform = os.platform();
  // 判断平台是Linux还是Windows
  if (platform === 'linux') {
    // 如果是Linux，使用os.loadavg()方法获取负载平均值
    const loadAvg = os.loadavg();
    return loadAvg[0] * 100
  } else if (platform === 'win32') {
    // 如果是Windows，使用os-utils模块获取CPU使用率
    const usage = await osUtils.cpuUsage()
    return usage * 100
  } else {
    return 0
  }
}

export async function createServer() {
  await server.register(cors, {
    origin: '*',
  })
  await server.register(fstatic, {
    root: path.join(__dirname, 'plugins/chatgpt-plugin/server/static/'),
  })
  await server.register(fastifyCookie)
  await server.get('/page/*', (request, reply) => {
    Statistics.WebAccess.count += 1
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/help/*', (request, reply) => {
    Statistics.WebAccess.count += 1
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/auth/*', (request, reply) => {
    Statistics.WebAccess.count += 1
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  await server.get('/admin/*', (request, reply) => {
    Statistics.WebAccess.count += 1
    const token = request.cookies.token || 'unknown'
    if (token != usertoken) {
        reply.redirect(301, '/auth/login')
    }
    const stream = fs.createReadStream('plugins/chatgpt-plugin/server/static/index.html')
    reply.type('text/html').send(stream)
  })
  // 登录
  server.post('/login', async (request, reply) => {
    Statistics.SystemAccess.count += 1
    const body = request.body || {}
    if (body.qq && body.passwd) {
      if (body.qq == Bot.uin && await redis.get('CHATGPT:ADMIN_PASSWD') == body.passwd) {
        usertoken = randomString(32)
        reply.setCookie('token', usertoken, {path: '/'})
        reply.send({login:true})
      } else {
        reply.send({login:false,err:'用户名密码错误'})
      }
    } else {
      reply.send({login:false,err:'未输入用户名或密码'})
    }
  })
  // 页面数据获取
  server.post('/page', async (request, reply) => {
    Statistics.SystemAccess.count += 1
    const body = request.body || {}
    if (body.code) {
      const dir = 'resources/ChatGPTCache/page'
      const filename = body.code + '.json'
      const filepath = path.join(dir, filename)
      let data = fs.readFileSync(filepath, 'utf8')
      reply.send(data)
    }
  })
  // 帮助内容获取
  server.post('/help', async (request, reply) => {
    Statistics.SystemAccess.count += 1
    const body = request.body || {}
    if (body.use) {
      const dir = 'plugins/chatgpt-plugin/resources'
      const filename = 'help.json'
      const filepath = path.join(dir, filename)
      let data = fs.readFileSync(filepath, 'utf8')
      data = JSON.parse(data)
      reply.send(data[body.use])
    }
  })
  // 创建页面缓存内容
  server.post('/cache', async (request, reply) => {
    Statistics.SystemAccess.count += 1
    const body = request.body || {}
    if (body.content) {
      const dir = 'resources/ChatGPTCache/page'
      const filename = body.entry + '.json'
      const filepath = path.join(dir, filename)
      const regexUrl = /\b((?:https?|ftp|file):\/\/[-a-zA-Z0-9+&@#\/%?=~_|!:,.;]*[-a-zA-Z0-9+&@#\/%=~_|])/g
      try {
        const ip = await getPublicIP()
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filepath, JSON.stringify({
          user: body.content.senderName,
          bot: Config.chatViewBotName || (body.bing ? 'Bing' : 'ChatGPT'),
          userImg: body.userImg || '',
          botImg: body.botImg || '',
          question: body.content.prompt,
          message: body.content.content,
          group: body.content.group,
          herf: `http://${body.cacheHost || (ip + ':' + Config.serverPort || 3321)}/page/${body.entry}`,
          quote: body.content.quote,
          images: body.content.images || [],
          suggest: body.content.suggest || [],
          time: new Date()
        }))
        Statistics.CacheFile.count += 1
        reply.send({ file: body.entry, cacheUrl: `http://${ip}:${Config.serverPort || 3321}/page/${body.entry}` })
      } catch (err) {
        console.error(err)
        reply.send({ file: body.entry, cacheUrl: `http://${ip}:${Config.serverPort || 3321}/page/${body.entry}`, error: '生成失败' })
      }
    }
  })
  // 获取系统状态
  server.post('/system-statistics', async (request, reply) => {
    Statistics.SystemAccess.count += 1
    Statistics.SystemLoad.count = await getLoad()
    reply.send(Statistics)
  })

  server.post('/sysconfig', async (request, reply) => {
    Statistics.SystemAccess.count += 1
    const token = request.cookies.token || 'unknown'
    if (token != usertoken) {
      reply.send({err: '未登录'})
    } else {
      reply.send(Config)
    }
  })
  

  //定时任务
  var rule = new schedule.RecurrenceRule();
  rule.hour = 0;
  rule.minute = 0;
  let job_Statistics = schedule.scheduleJob(rule, function() {
    Statistics.SystemAccess.oldCount = Statistics.SystemAccess.count
    Statistics.CacheFile.oldCount = Statistics.CacheFile.count
    Statistics.WebAccess.oldCount = Statistics.WebAccess.count
    Statistics.SystemAccess.count = 0
    Statistics.CacheFile.count = 0
    Statistics.WebAccess.count = 0
  });
  let job_Statistics_SystemLoad = schedule.scheduleJob('0 * * * *', async function(){
    Statistics.SystemLoad.count = await getLoad()
    Statistics.SystemLoad.oldCount = Statistics.SystemLoad.count
  });
  
  server.listen({
    port: Config.serverPort || 3321,
    host: '0.0.0.0'
  }, (error) => {
    if (error) {
      console.error(error);
    }
    server.log.info(`server listening on ${server.server.address().port}`)
  })
}