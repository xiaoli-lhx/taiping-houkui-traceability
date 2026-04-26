import { useCallback, useEffect, useMemo, useState } from 'react'
import { QrcodeOutlined, SearchOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Descriptions, Empty, Input, Row, Space, Tag, Timeline, Typography } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'

import { hasRole } from '../auth/roles'
import { useAuth } from '../auth/useAuth'
import { EmptyState } from '../components/EmptyState'
import { QualityRadarCard, TraceCodeCard } from '../components/charts'
import { api } from '../lib/api'
import { formatDateTime, getAuditStatusMeta, getRectificationStatusMeta, getStageLabel } from '../lib/display'
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

  const runSearch = useCallback(
    async (targetCode: string) => {
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
    },
    [setSearchParams, token, user],
  )

  useEffect(() => {
    void runSearch(initialCode)
  }, [initialCode, runSearch])

  return (
    <Space direction="vertical" size={16} className="admin-page-stack">
      <Card bordered={false} className="public-query-hero-card">
        <Row gutter={[24, 24]} align="middle">
          <Col xs={24} lg={14}>
            <Space direction="vertical" size={12}>
              <Tag bordered={false} className="admin-hero-badge">
                Public Trace Query
              </Tag>
              <Typography.Title level={2} className="admin-hero-title">
                太平猴魁溯源查询
              </Typography.Title>
              <Typography.Paragraph className="admin-hero-description">
                输入溯源码、批次码或产品编号，查看茶叶来源、流转阶段、公开品质结果与监管状态，建立可信的公开透明链路。
              </Typography.Paragraph>
              <Space.Compact className="public-query-input-group">
                <Input value={code} onChange={(event) => setCode(event.target.value)} placeholder="请输入溯源码" />
                <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => void runSearch(code)}>
                  查询
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
          </Col>
          <Col xs={24} lg={10}>
            <div className="public-query-sidecard">
              <QrcodeOutlined className="public-query-sideicon" />
              <Typography.Title level={4} style={{ margin: 0 }}>
                公开透明溯源
              </Typography.Title>
              <Typography.Text type="secondary">
                支持扫码或输入查询码，查看从产地、采摘、加工、包装到流通的完整链路。
              </Typography.Text>
            </div>
          </Col>
        </Row>
      </Card>

      {error ? <Alert showIcon type="error" message={error} /> : null}

      {result ? (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} xl={15}>
              <TraceCodeCard
                batchCode={result.batch.batch_code}
                traceCode={result.batch.trace_code}
                queryUrl={queryUrl}
                latestGrade={result.batch.latest_grade}
              />
            </Col>
            <Col xs={24} xl={9}>
              <Card bordered={false} className="admin-section-card">
                <Typography.Title level={4} style={{ marginTop: 0 }}>
                  产品信息
                </Typography.Title>
                <Descriptions column={1} size="small" className="public-query-descriptions">
                  <Descriptions.Item label="茶名">{result.batch.tea_name}</Descriptions.Item>
                  <Descriptions.Item label="茶类">{result.batch.tea_type}</Descriptions.Item>
                  <Descriptions.Item label="产地">{result.batch.origin}</Descriptions.Item>
                  <Descriptions.Item label="茶园主体">{result.batch.farm_name}</Descriptions.Item>
                  <Descriptions.Item label="企业主体">{result.batch.enterprise_name}</Descriptions.Item>
                  <Descriptions.Item label="批次重量">{result.batch.quantity_kg} kg</Descriptions.Item>
                  <Descriptions.Item label="审核状态">
                    <Tag color={getAuditStatusMeta(result.batch.audit_status).color}>{getAuditStatusMeta(result.batch.audit_status).text}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="整改状态">
                    <Tag color={getRectificationStatusMeta(result.batch.rectification_status).color}>
                      {getRectificationStatusMeta(result.batch.rectification_status).text}
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
                      <Link to="/consumer/feedback">提交反馈</Link>
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
                <Card bordered={false} className="admin-section-card">
                  <Typography.Title level={4} style={{ marginTop: 0 }}>
                    品质雷达图
                  </Typography.Title>
                  <Empty description="暂无公开品质评估信息" />
                </Card>
              )}
            </Col>
            <Col xs={24} xl={13}>
              <Card bordered={false} className="admin-section-card">
                <Typography.Title level={4} style={{ marginTop: 0 }}>
                  品质评估结果
                </Typography.Title>
                {result.latest_evaluation ? (
                  <div className="public-query-score-panel">
                    <div className="public-query-score-main">
                      <strong>{result.latest_evaluation.evaluation.total_score}</strong>
                      <span>综合评分</span>
                    </div>
                    <div className="public-query-score-grid">
                      <div>
                        <Typography.Text type="secondary">等级判定</Typography.Text>
                        <Typography.Title level={4}>{result.latest_evaluation.evaluation.grade}</Typography.Title>
                      </div>
                      <div>
                        <Typography.Text type="secondary">评估时间</Typography.Text>
                        <Typography.Title level={5}>{formatDateTime(result.latest_evaluation.evaluation.evaluated_at)}</Typography.Title>
                      </div>
                    </div>
                    <Typography.Paragraph style={{ marginBottom: 0 }}>
                      {result.latest_evaluation.evaluation.summary}
                    </Typography.Paragraph>
                  </div>
                ) : (
                  <EmptyState description="暂无公开品质评估结果" />
                )}
              </Card>
            </Col>
          </Row>

          <Card bordered={false} className="admin-section-card">
            <Typography.Title level={4} style={{ marginTop: 0 }}>
              完整溯源路径
            </Typography.Title>
            <Timeline
              items={result.trace_path.map((item) => ({
                color: 'green',
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
                      {item.location} · {item.operator_name} · {formatDateTime(item.occurred_at)}
                    </Typography.Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </>
      ) : !loading && !error ? (
        <Card bordered={false} className="admin-section-card">
          <EmptyState description="请输入溯源码、批次码或产品编号进行查询" />
        </Card>
      ) : null}
    </Space>
  )
}
