import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import path from 'path'
import { existsSync } from 'fs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: pathSegments } = await params

    // Декодируем URL-кодированные символы в именах файлов
    const decodedPath = pathSegments.map((segment) => decodeURIComponent(segment))
    const filePath = path.join(process.cwd(), 'media', ...decodedPath)

    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found', path: filePath }, { status: 404 })
    }

    const file = await readFile(filePath)
    const ext = path.extname(filePath).toLowerCase()

    let contentType = 'application/octet-stream'

    switch (ext) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg'
        break
      case '.png':
        contentType = 'image/png'
        break
      case '.gif':
        contentType = 'image/gif'
        break
      case '.webp':
        contentType = 'image/webp'
        break
      case '.svg':
        contentType = 'image/svg+xml'
        break
    }

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Media serve error:', error)
    return NextResponse.json({ error: 'Failed to serve media' }, { status: 500 })
  }
}
