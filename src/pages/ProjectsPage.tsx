import { useState } from 'react'

import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Button, DatePicker, Empty, Flex, Form, Input, Modal, Typography } from 'antd'
import type { Dayjs } from 'dayjs'
import { useNavigate } from 'react-router'

import { createProject, getProjects } from '@/api/projects'
import { queryKeys } from '@/api/queryKeys'
import { DataTable } from '@/components/DataTable'
import type { Project } from '@/types'

interface ProjectFormValues {
  name: string
  siteName: string
  period?: [Dayjs, Dayjs]
  /** 사진대지의 `구 분`으로 쓸 공종. 나중에 공종 화면에서 더할 수 있다 */
  trades?: string[]
}

export function ProjectsPage() {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<ProjectFormValues>()
  const [open, setOpen] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: queryKeys.projects,
    queryFn: getProjects,
  })

  const { mutate: create, isPending } = useMutation({
    mutationFn: createProject,
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects })
      setOpen(false)
      form.resetFields()
      navigate(`/projects/${project.id}/sheet`)
    },
    // 저장에 실패해도 입력값은 유지한 채 재시도를 안내한다
    onError: () => message.error('프로젝트 저장에 실패했습니다. 잠시 후 다시 시도해주세요.'),
  })

  const columns = [
    { title: '공사명', dataIndex: 'name' },
    { title: '현장명', dataIndex: 'siteName' },
    {
      title: '공사 기간',
      render: (_: unknown, row: Project) =>
        row.startDate && row.endDate ? `${row.startDate} ~ ${row.endDate}` : '-',
    },
    {
      title: '',
      width: 100,
      render: (_: unknown, row: Project) => (
        <Button type="link" onClick={() => navigate(`/projects/${row.id}/sheet`)}>
          열기
        </Button>
      ),
    },
  ]

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center">
        <Typography.Title level={3} style={{ margin: 0 }}>
          프로젝트
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          프로젝트 생성
        </Button>
      </Flex>

      <DataTable
        rowKey="id"
        loading={isLoading}
        dataSource={projects}
        columns={columns}
        locale={{ emptyText: <Empty description="등록된 프로젝트가 없습니다" /> }}
      />

      <Modal
        title="프로젝트 생성"
        open={open}
        confirmLoading={isPending}
        onCancel={() => setOpen(false)}
        onOk={() => form.submit()}
        okText="생성"
        cancelText="취소"
        destroyOnHidden={false}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) =>
            create({
              name: values.name,
              siteName: values.siteName,
              startDate: values.period?.[0].format('YYYY-MM-DD') ?? null,
              endDate: values.period?.[1].format('YYYY-MM-DD') ?? null,
              trades: values.trades ?? [],
            })
          }
        >
          <Form.Item
            name="name"
            label="공사명"
            rules={[{ required: true, message: '공사명을 입력해주세요' }]}
          >
            <Input placeholder="○○ 신축공사" />
          </Form.Item>
          <Form.Item
            name="siteName"
            label="현장명"
            rules={[{ required: true, message: '현장명을 입력해주세요' }]}
          >
            <Input placeholder="가산동 현장" />
          </Form.Item>
          <Form.Item name="period" label="공사 기간">
            <DatePicker.RangePicker style={{ width: '100%' }} />
          </Form.Item>

          {/*
            공종은 사진대지의 `구 분`이 된다.
            여기서 비워도 나중에 공종 화면에서 더할 수 있어 필수로 걸지 않는다 —
            현장 사진을 먼저 올려보고 공종을 정하는 순서도 흔하다.
          */}
          <Form.Item label="공종" tooltip="사진대지에서 구분으로 고르게 됩니다">
            <Form.List name="trades">
              {(fields, { add: addTrade, remove: removeTrade }) => (
                <Flex vertical gap={8}>
                  {fields.map((field) => (
                    <Flex key={field.key} gap={8}>
                      <Form.Item {...field} noStyle>
                        <Input placeholder="보온덕트입상" />
                      </Form.Item>
                      <Button
                        type="text"
                        icon={<MinusCircleOutlined />}
                        onClick={() => removeTrade(field.name)}
                        aria-label="공종 줄 지우기"
                      />
                    </Flex>
                  ))}
                  <div>
                    <Button icon={<PlusOutlined />} onClick={() => addTrade('')}>
                      공종 추가
                    </Button>
                  </div>
                </Flex>
              )}
            </Form.List>
          </Form.Item>
        </Form>
      </Modal>
    </Flex>
  )
}
