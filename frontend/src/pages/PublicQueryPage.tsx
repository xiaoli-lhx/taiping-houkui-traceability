import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Descriptions, Empty, Input, Row, Space, Tag, Timeline, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { Link, useSearchParams } from 'react-router-dom'

import { hasRole } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { QualityRadarCard, TraceCodeCard } from '../components/charts'
import { api } from '../lib/api'
import { formatDateTime, getAuditStatusMeta, getStageLabel } from '../lib/display'
import type { PublicTraceView } from '../types'

const demoCodes = ['TRACE-HK202603-001', 'TRACE-HK202603-002']
const publicQueryBaseUrl = import.meta.env.VITE_PUBLIC_QUERY_BASE_URL

export function PublicQueryPage() {
  const { token, user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const initialCode = searchParams.get('code') || 'TRACE-HK202603-001'
  const [code, setCode] = useState(initialCode)
  const [result, setResult] = useState<PublicTraceView | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const queryUrl = useMemo(() => {
    if (publicQueryBaseUrl) {
      return `${publicQueryBaseUrl.replace(/\/$/, '')}/public-query?code=${encodeURIComponent(code)}`
    }
    if (typeof window === 'undefined') {
      return `http://127.0.0.1:3000/public-query?code=${encodeURIComponent(code)}`
    }
    return `${window.location.origin}/public-query?code=${encodeURIComponent(code)}`
  }, [code])

  const runSearch = useCallback(async (targetCode: string) => {
    setLoading(true)
    setError('')
    try {
      const trace = await api.getPublicTrace(targetCode)
      setResult(trace)
      setSearchParams({ code: targetCode }, { replace: true })
      if (token && hasRole(user, 'consumer')) {
        try {
          await api.createHistory(token, targetCode)
        } catch {
          // ignore history logging failure on public page
        }
      }
    } catch (searchError) {
      setResult(null)
      setError(searchError instanceof Error ? searchError.message : '查询失败')
    } finally {
      setLoading(false)
    }
  }, [setSearchParams, token, user])

  useEffect(() => {
    void runSearch(initialCode)
  }, [initialCode, runSearch])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card className="public-page-hero">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Tag color="blue" style={{ width: 'fit-content' }}>
            消费者扫码查询入口
          </Tag>
          <Typography.Title level={2} style={{ margin: 0 }}>
            太平猴魁公开溯源查询
          </Typography.Title>
          <Typography.Text type="secondary">
            输入溯源码、批次码或产品编号，即可查看茶叶来源、流转阶段与品质评估结果。
          </Typography.Text>
          <Space.Compact style={{ width: '100%' }}>
            <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="请输入溯源码" />
            <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => void runSearch(code)}>
              开始查询
            </Button>
          </Space.Compact>
          <Space wrap>
            {demoCodes.map((demoCode) => (
              <Button
                key={demoCode}
                onClick={() => {
                  setCode(demoCode)
                  void runSearch(demoCode)
                }}
              >
                {demoCode}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      {result ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={14}>
              <TraceCodeCard
                batchCode={result.batch.batch_code}
                traceCode={result.batch.trace_code}
                queryUrl={queryUrl}
                latestGrade={result.batch.latest_grade}
              />
            </Col>
            <Col xs={24} xl={10}>
              <Card title="产品信息">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="茶名">{result.batch.tea_name}</Descriptions.Item>
                  <Descriptions.Item label="茶类">{result.batch.tea_type}</Descriptions.Item>
                  <Descriptions.Item label="产地">{result.batch.origin}</Descriptions.Item>
                  <Descriptions.Item label="茶园主体">{result.batch.farm_name}</Descriptions.Item>
                  <Descriptions.Item label="企业主体">{result.batch.enterprise_name}</Descriptions.Item>
                  <Descriptions.Item label="批次重量">{result.batch.quantity_kg} kg</Descriptions.Item>
                  <Descriptions.Item label="审核状态">
                    <Tag color={getAuditStatusMeta(result.batch.audit_status).color}>
                      {getAuditStatusMeta(result.batch.audit_status).text}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="品质等级">{result.batch.latest_grade || '暂无等级'}</Descriptions.Item>
                </Descriptions>
                {token && hasRole(user, 'consumer') ? (
                  <Space style={{ marginTop: 16 }} wrap>
                    <Button type="primary" onClick={() => void api.createFavorite(token, result.batch.id)}>
                      收藏该批次
                    </Button>
                    <Button>
                      <Link to="/consumer/feedback">去提交反馈</Link>
                    </Button>
                  </Space>
                ) : null}
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} xl={11}>
              {result.latest_evaluation ? (
                <QualityRadarCard items={result.latest_evaluation.radar_data} title="品质雷达图" />
              ) : (
                <Card title="品质雷达图">
                  <Empty description="暂无公开品质评估信息" />
                </Card>
              )}
            </Col>
            <Col xs={24} xl={13}>
              <Card title="品质摘要">
                {result.latest_evaluation ? (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="综合得分">
                      {result.latest_evaluation.evaluation.total_score}
                    </Descriptions.Item>
                    <Descriptions.Item label="等级判定">
                      {result.latest_evaluation.evaluation.grade}
                    </Descriptions.Item>
                    <Descriptions.Item label="评估时间">
                      {formatDateTime(result.latest_evaluation.evaluation.evaluated_at)}
                    </Descriptions.Item>
                    <Descriptions.Item label="评估结论">
                      {result.latest_evaluation.evaluation.summary}
                    </Descriptions.Item>
                  </Descriptions>
                ) : (
                  <EmptyState description="暂无公开品质评估结果" />
                )}
              </Card>
            </Col>
          </Row>

          <Card title="完整溯源路径">
            <Timeline
              items={result.trace_path.map((item) => ({
                color: 'blue',
                children: (
                  <div>
                    <Space wrap>
                      <Typography.Text strong>{item.title}</Typography.Text>
                      <Tag>{getStageLabel(item.stage)}</Tag>
                    </Space>
                    <div style={{ marginTop: 6 }}>
                      <Typography.Text>{item.description}</Typography.Text>
                    </div>
                    <Typography.Text type="secondary">
                      {item.location} | {item.operator_name} | {formatDateTime(item.occurred_at)}
                    </Typography.Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </>
      ) : (
        !loading && !error ? (
          <Card>
            <EmptyState description="请输入溯源码、批次码或产品编号进行查询" />
          </Card>
        ) : null
      )}
    </Space>
  )
}
