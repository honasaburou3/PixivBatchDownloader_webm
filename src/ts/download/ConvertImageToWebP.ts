/** 将静态图片转换为 WebP */
class ConvertImageToWebP {
  /** 同时进行的图片转换任务数量 */
  private readonly concurrentTaskCount = 2

  /** 正在执行的图片转换任务数量 */
  private runningTaskCount = 0

  /** 等待执行的图片转换任务 */
  private taskQueue: Array<{
    file: Blob
    resolve: (file: Blob) => void
    reject: (reason?: unknown) => void
  }> = []

  /** 将 JPEG 或 PNG 图片缩小后转换为 WebP */
  public convert(file: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.taskQueue.push({ file, resolve, reject })
      this.runNextTask()
    })
  }

  /** 最大同时执行两个转换任务 */
  private runNextTask() {
    while (
      this.runningTaskCount < this.concurrentTaskCount &&
      this.taskQueue.length > 0
    ) {
      const task = this.taskQueue.shift()!
      this.runningTaskCount++

      void this.convertFile(task.file)
        .then(task.resolve, task.reject)
        .finally(() => {
          this.runningTaskCount--
          this.runNextTask()
        })
    }
  }

  /** 执行实际的图片缩放和 WebP 编码 */
  private async convertFile(file: Blob): Promise<Blob> {
    const image = await createImageBitmap(file)

    try {
      const { width, height } = this.getTargetSize(image.width, image.height)
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      ctx.drawImage(image, 0, 0, width, height)

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert image to WebP'))
            }
          },
          'image/webp',
          0.85
        )
      })
    } finally {
      image.close()
    }
  }

  /** 计算保持比例且长边不超过 2048 px 的尺寸 */
  private getTargetSize(width: number, height: number) {
    const maxSize = 2048
    const scale = Math.min(1, maxSize / Math.max(width, height))
    return {
      width: Math.round(width * scale),
      height: Math.round(height * scale),
    }
  }
}

const convertImageToWebP = new ConvertImageToWebP()
export { convertImageToWebP }
