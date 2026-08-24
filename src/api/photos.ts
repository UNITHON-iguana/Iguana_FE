import { photos } from '@/mocks/db'
import { delay } from '@/mocks/delay'
import { placeholderImage } from '@/mocks/placeholder'
import type { Photo, WorkItem } from '@/types'

export function getPhotos(projectId: string): Promise<Photo[]> {
  return delay(photos.filter((p) => p.projectId === projectId).map((p) => ({ ...p })))
}

export function getPhoto(photoId: string): Promise<Photo | undefined> {
  const found = photos.find((p) => p.id === photoId)
  return delay(found && { ...found })
}

/** 업로드 목록에 사진을 추가한다. 이 시점에는 아직 분석하지 않는다 */
export function addPhotos(projectId: string, files: File[]): Promise<Photo[]> {
  const nextSeq = photos.reduce((max, p) => Math.max(max, p.seq), 0) + 1
  const added = files.map((file, index) => {
    const seq = nextSeq + index
    const photo: Photo = {
      id: `ph${Date.now()}_${index}`,
      projectId,
      seq,
      fileName: file.name,
      originalUrl: placeholderImage(String(seq)),
      croppedUrl: null,
      status: 'uploading',
      failureReason: null,
      workDate: null,
      location: null,
      workItems: [],
      reviewStatus: 'pending',
    }
    photos.push(photo)
    return photo
  })

  // 업로드 완료까지 잠깐 걸리는 것처럼 보이게 한다
  added.forEach((photo, index) => {
    setTimeout(
      () => {
        photo.status = 'analyzing'
      },
      400 + index * 200,
    )
  })

  return delay(added.map((p) => ({ ...p })))
}

export function removePhoto(photoId: string): Promise<void> {
  const index = photos.findIndex((p) => p.id === photoId)
  if (index >= 0) photos.splice(index, 1)
  return delay(undefined)
}

/**
 * AI 분석을 실행한다.
 *
 * 프로토타입에서는 사진마다 시차를 두고 결과를 채워 넣어
 * 분석 중 → 완료 흐름이 화면에서 실제로 움직이게 한다.
 * 개별 사진 실패가 다른 사진 분석을 막지 않는다는 것도 여기서 드러난다.
 */
export function startAnalysis(projectId: string): Promise<void> {
  const targets = photos.filter((p) => p.projectId === projectId && p.status !== 'analyzed')

  targets.forEach((photo, index) => {
    photo.status = 'analyzing'
    // 재분석이면 이전 실패 사유를 지운다
    photo.failureReason = null
    setTimeout(
      () => {
        // 마지막 한 장은 분석에 실패하는 경우를 보여준다
        if (index > 0 && index === targets.length - 1) {
          photo.status = 'failed'
          photo.failureReason = '텍스트 영역을 찾지 못했습니다'
          return
        }
        photo.status = 'analyzed'
        photo.croppedUrl = placeholderImage(String(photo.seq), '#e8e8e8')
        photo.workDate = '2026-08-24'
        photo.location = '지하2층'
        photo.workItems = [
          {
            id: `w${photo.id}_1`,
            category: '무보온덕트벽체',
            description: '덕트 관통부',
            spec: '800*400',
            quantity: 1,
            unit: '개소',
          },
        ]
      },
      1500 + index * 1200,
    )
  })

  return delay(undefined, 200)
}

export interface PhotoReviewInput {
  workDate: string | null
  location: string | null
  workItems: WorkItem[]
  reviewStatus: Photo['reviewStatus']
}

export function savePhotoReview(photoId: string, input: PhotoReviewInput): Promise<Photo> {
  const photo = photos.find((p) => p.id === photoId)
  if (!photo) throw new Error('사진을 찾을 수 없습니다')

  Object.assign(photo, input)
  return delay({ ...photo }, 400)
}
