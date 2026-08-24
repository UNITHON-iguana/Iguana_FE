import ExcelJS from 'exceljs'

import type { Photo } from '@/types'

/**
 * 검수 완료된 현장 기록을 기본 엑셀(XLSX)로 만든다.
 * 사진 한 장에 작업 항목이 여러 줄 붙으므로 항목 단위로 한 행씩 펼친다.
 */
export async function buildRecordsWorkbook(projectName: string, photos: Photo[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('현장 기록')
  sheet.properties.defaultRowHeight = 18

  sheet.columns = [
    { header: '사진번호', key: 'seq', width: 10 },
    { header: '작업일', key: 'workDate', width: 14 },
    { header: '위치', key: 'location', width: 14 },
    { header: '구분', key: 'category', width: 24 },
    { header: '작업내용', key: 'description', width: 24 },
    { header: '규격', key: 'spec', width: 14 },
    { header: '수량', key: 'quantity', width: 10 },
    { header: '단위', key: 'unit', width: 10 },
  ]
  sheet.getRow(1).font = { bold: true }

  // 공사명을 머리글에 남겨 어느 현장 자료인지 파일만 봐도 알 수 있게 한다
  sheet.headerFooter.oddHeader = `&L${projectName}&R사진대지 현장 기록`

  for (const photo of photos) {
    for (const item of photo.workItems) {
      sheet.addRow({
        seq: photo.seq,
        workDate: photo.workDate ?? '',
        location: photo.location ?? '',
        category: item.category ?? '',
        description: item.description ?? '',
        spec: item.spec ?? '',
        quantity: item.quantity ?? '',
        unit: item.unit ?? '',
      })
    }
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

/** 생성한 파일을 브라우저에서 내려받는다 */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
