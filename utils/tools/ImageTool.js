import { AbstractTool } from './AbstractTool.js'
import { getToimg, downImg, fileImgList } from '../../utils/ToDoimg.js'

export class ImageProcessTool extends AbstractTool {
    name = 'imageProcess'
    #availableImages = []
    #initialized = false
    #currentImageIndex = 0
    #totalImages = 0
    #needReprocess = false

    parameters = {
        properties: {
            action: {
                type: 'string',
                enum: ['get', 'download', 'notImage', 'listImages'],
                description: 'Action to perform: get (local image), download (save image), notImage (switch mode), or listImages'
            },
            imageName: {
                type: 'string',
                description: 'Name or tag of the image'
            },
            imageData: {
                type: 'string',
                description: 'Base64 image data for download action'
            }
        },
        required: ['action']
    }

    constructor(e, previousRole, bymGo) {
        super()
        this.e = e
        this.previousRole = previousRole
        this.bymGo = bymGo
        this.initializeImageList()
    }

    func = async function (opts) {
        const { action, imageName, imageData } = opts

        try {
            switch (action) {
                case 'get':
                    const getResult = await this.handleGetImage(imageName)
                    return getResult

                case 'download':
                    const downloadResult = await this.handleDownloadImage(imageName, imageData)
                    return downloadResult

                case 'notImage':
                    const notImageResult = await this.handleNotImage()
                    return notImageResult

                case 'listImages':
                    return this.getImagesPrompt() // 直接返回列表文本，让模型知道有哪些表情包

                default:
                    throw new Error(`未知操作: ${action}`)
            }
        } catch (error) {
            throw error
        }
    }

    async initializeImageList() {
        try {
            this.#availableImages = await fileImgList()
            this.#initialized = true
        } catch (error) {
            this.#availableImages = []
        }
    }

    async getAvailableImages() {
        if (!this.#initialized) {
            await this.initializeImageList()
        }
        return this.#availableImages
    }

    async getImagesPrompt() {
        const images = await this.getAvailableImages()
        if (images.length === 0) {
            return '当前没有可用的表情包'
        }
        return `可用的表情包列表（共 ${images.length} 个）：\n${images.join('\n')}\n\n使用方法：发送 GETIMG: <表情包名称> 来使用表情包`
    }

    async processText(text, options = {}) {
        // 初始化或重置图片处理信息
        if (options.images?.length > 0) {
            this.#totalImages = options.images.length
            // 只在新的处理周期时重置索引
            if (!this.#needReprocess && this.#currentImageIndex >= this.#totalImages) {
                this.#currentImageIndex = 0
            }
        } else if (options.image) {
            this.#totalImages = 1
            if (!this.#needReprocess) {
                this.#currentImageIndex = 0
            }
        }

        const commands = {
            get: {
                regex: /GETIMG:\s*([\s\S]+?)\s*$/i,
                handler: async (match) => {
                    const imageName = match[1].trim()
                    await this.handleGetImage(imageName)
                    return null
                }
            },
            notImage: {
                regex: /NOTIMG(.*)/i,
                handler: async (match) => {
                    const result = await this.handleNotImage()
                    if (result.success) {
                        // 标记需要重新处理当前图片
                        this.#needReprocess = true
                        return {
                            success: true,
                            continueProcess: true,
                            currentIndex: this.#currentImageIndex,  // 保持当前索引不变
                            switchRole: result.switchRole,
                            needResponse: result.needResponse,
                            reprocess: true  // 添加重新处理标记
                        }
                    }
                    return true
                }
            },
            download: {
                regex: /DOWNIMG:\s*(.+)/i,
                handler: async (match) => {
                    const baseName = match[1].trim()
                    if (options.images) {
                        const imageName = this.#totalImages === 1
                            ? baseName
                            : `${baseName}_${this.#currentImageIndex + 1}`
                        await this.handleDownloadImage(imageName, options.images[this.#currentImageIndex])

                        // 处理完当前图片后，重置重新处理标记
                        this.#needReprocess = false

                        // 只有在不是重新处理时才增加索引
                        if (this.#currentImageIndex < this.#totalImages - 1) {
                            this.#currentImageIndex++
                            return {
                                success: true,
                                continueProcess: true,
                                currentIndex: this.#currentImageIndex
                            }
                        }
                    } else if (options.image) {
                        await this.handleDownloadImage(baseName, options.image)
                    }
                    return null
                }
            },
            list: {
                regex: /^(?:表情包列表|查看表情包|列出表情包)$/i,
                handler: async () => {
                    await this.e.reply(await this.getImagesPrompt())
                    return true
                }
            }
        }

        for (const [type, { regex, handler }] of Object.entries(commands)) {
            const match = text.match(regex)
            if (match) {
                try {
                    const result = await handler(match)
                    return result
                } catch (error) {
                    await this.e.reply(`处理失败: ${error.message}`)
                    return true
                }
            }
        }
        return null
    }
    async handleGetImage(imageName) {
        if (!imageName) {
            throw new Error('需要指定表情包名称')
        }

        try {
            const result = await getToimg(this.e, imageName)

            if (result === undefined) {
                await this.e.reply(`未找到匹配的表情包: ${imageName}`)
            }

            return null
        } catch (error) {
            throw error
        }
    }

    async handleDownloadImage(imageName, imageData) {
        if (!imageName || !imageData) {
            throw new Error('需要提供图片名称和数据')
        }
        try {
            const text = `DOWNIMG: ${imageName}`
            await downImg(this.e, imageData, text)
            await this.initializeImageList()
            return null
        } catch (error) {
            throw error
        }
    }

    async handleNotImage() {
        try {
            return {
                success: true,
                switchRole: this.previousRole,
                needResponse: true
            }
        } catch (error) {
            throw error
        }
    }
    getCurrentProgress() {
        return {
            currentIndex: this.#currentImageIndex,
            totalImages: this.#totalImages,
            isProcessing: this.#currentImageIndex < this.#totalImages
        }
    }


    description = `图片处理工具：支持发送本地表情包、保存新表情包、切换处理模式。
可用命令：
- GETIMG: <表情包名称> - 发送指定表情包
- DOWNIMG: <名称> - 保存当前图片为表情包
- NOTIMG - 切换到文本模式
- 表情包列表 - 查看所有可用表情包
\n\n多图片处理说明：
- 当处理多张图片时，会自动为每张图片添加序号后缀
- 例如：DOWNIMG: happy 命令处理多张图片时会保存为 happy_1, happy_2 等\n`
    // 添加 getSystemPrompt 方法
    async getSystemPrompt() {
        const images = await this.getAvailableImages()
        const progress = this.getCurrentProgress()
        let prompt = `${this.description}\n`

        if (progress.isProcessing) {
            prompt += `\n当前正在处理第 ${progress.currentIndex + 1}/${progress.totalImages} 张图片\n`
        }

        if (images.length > 0) {
            prompt += `\n当前可用的表情包：\n${images.join('\n')}`
            prompt += `\n使用 GETIMG: <表情包名称> 来发送表情包`
        } else {
            prompt += '\n当前没有可用的表情包'
        }

        return prompt
    }
}

export async function initializeImageTool(e, previousRole, bymGo) {
    const tool = new ImageProcessTool(e, previousRole, bymGo)
    await tool.initializeImageList() // 确保初始化完成
    return tool
}