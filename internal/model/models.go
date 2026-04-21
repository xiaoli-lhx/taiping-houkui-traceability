package model

import "time"

const (
	RoleAdmin      = "admin"
	RoleFarmer     = "farmer"
	RoleEnterprise = "enterprise"
	RoleRegulator  = "regulator"
	RoleConsumer   = "consumer"

	UserStatusActive   = "active"
	UserStatusDisabled = "disabled"

	ApprovalPending  = "pending"
	ApprovalApproved = "approved"
	ApprovalRejected = "rejected"
	ApprovalDisabled = "disabled"

	BatchStatusDraft      = "draft"
	BatchStatusProcessing = "processing"
	BatchStatusCompleted  = "completed"

	AuditStatusPending  = "pending"
	AuditStatusApproved = "approved"
	AuditStatusRejected = "rejected"

	StagePlanting     = "planting"
	StagePicking      = "picking"
	StageProcessing   = "processing"
	StagePackaging    = "packaging"
	StageDistribution = "distribution"
)

type User struct {
	ID              uint       `gorm:"primaryKey" json:"id"`
	Username        string     `gorm:"size:64;uniqueIndex;not null" json:"username"`
	PasswordHash    string     `gorm:"size:255;not null" json:"-"`
	DisplayName     string     `gorm:"size:128;not null" json:"display_name"`
	Phone           string     `gorm:"size:32" json:"phone"`
	Organization    string     `gorm:"size:128" json:"organization"`
	ContactInfo     string     `gorm:"size:255" json:"contact_info"`
	RoleCode        string     `gorm:"size:32;index;not null" json:"role_code"`
	Status          string     `gorm:"size:32;default:active" json:"status"`
	ApprovalStatus  string     `gorm:"size:32;default:pending;index" json:"approval_status"`
	ApprovedBy      *uint      `gorm:"index" json:"approved_by,omitempty"`
	ApprovedAt      *time.Time `json:"approved_at,omitempty"`
	RejectionReason string     `gorm:"size:255" json:"rejection_reason"`
	Roles           []Role     `gorm:"many2many:user_roles;" json:"roles,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Role struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Code        string    `gorm:"size:32;uniqueIndex;not null" json:"code"`
	Name        string    `gorm:"size:64;not null" json:"name"`
	Description string    `gorm:"size:255" json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type UserRole struct {
	UserID    uint      `gorm:"primaryKey" json:"user_id"`
	RoleID    uint      `gorm:"primaryKey" json:"role_id"`
	CreatedAt time.Time `json:"created_at"`
}

type TeaBatch struct {
	ID                 uint                `gorm:"primaryKey" json:"id"`
	BatchCode          string              `gorm:"size:64;uniqueIndex;not null" json:"batch_code"`
	TraceCode          string              `gorm:"size:64;uniqueIndex;not null" json:"trace_code"`
	ProductCode        string              `gorm:"size:64;index" json:"product_code"`
	TeaName            string              `gorm:"size:128;not null" json:"tea_name"`
	TeaType            string              `gorm:"size:64;not null" json:"tea_type"`
	Origin             string              `gorm:"size:128;not null" json:"origin"`
	FarmName           string              `gorm:"size:128" json:"farm_name"`
	EnterpriseName     string              `gorm:"size:128" json:"enterprise_name"`
	QuantityKg         float64             `gorm:"type:decimal(10,2)" json:"quantity_kg"`
	HarvestDate        *time.Time          `json:"harvest_date,omitempty"`
	PackagingDate      *time.Time          `json:"packaging_date,omitempty"`
	Status             string              `gorm:"size:32;default:draft" json:"status"`
	AuditStatus        string              `gorm:"size:32;default:pending" json:"audit_status"`
	LatestGrade        string              `gorm:"size:32" json:"latest_grade"`
	PublicVisible      bool                `gorm:"default:true" json:"public_visible"`
	Notes              string              `gorm:"type:text" json:"notes"`
	CreatedBy          uint                `gorm:"index" json:"created_by"`
	StageRecords       []TraceStageRecord  `gorm:"foreignKey:BatchID" json:"stage_records,omitempty"`
	QualityEvaluations []QualityEvaluation `gorm:"foreignKey:BatchID" json:"quality_evaluations,omitempty"`
	AuditRecords       []AuditRecord       `gorm:"foreignKey:BatchID" json:"audit_records,omitempty"`
	CreatedAt          time.Time           `json:"created_at"`
	UpdatedAt          time.Time           `json:"updated_at"`
}

type TraceStageRecord struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	BatchID      uint      `gorm:"index;not null" json:"batch_id"`
	Stage        string    `gorm:"size:32;index;not null" json:"stage"`
	Sequence     int       `gorm:"not null" json:"sequence"`
	Title        string    `gorm:"size:128;not null" json:"title"`
	Description  string    `gorm:"type:text" json:"description"`
	Location     string    `gorm:"size:255" json:"location"`
	OperatorID   uint      `gorm:"index" json:"operator_id"`
	OperatorName string    `gorm:"size:128" json:"operator_name"`
	OperatorRole string    `gorm:"size:32" json:"operator_role"`
	OccurredAt   time.Time `json:"occurred_at"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type QualityEvaluation struct {
	ID            uint                  `gorm:"primaryKey" json:"id"`
	BatchID       uint                  `gorm:"index;not null" json:"batch_id"`
	EvaluatorID   uint                  `gorm:"index;not null" json:"evaluator_id"`
	RuleVersion   string                `gorm:"size:32;not null" json:"rule_version"`
	TotalScore    float64               `gorm:"type:decimal(10,2)" json:"total_score"`
	Grade         string                `gorm:"size:32;index" json:"grade"`
	Summary       string                `gorm:"type:text" json:"summary"`
	EvaluatedAt   time.Time             `gorm:"index" json:"evaluated_at"`
	MetricDetails []QualityMetricDetail `gorm:"foreignKey:EvaluationID" json:"metric_details,omitempty"`
	CreatedAt     time.Time             `json:"created_at"`
	UpdatedAt     time.Time             `json:"updated_at"`
}

type QualityMetricDetail struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	EvaluationID  uint      `gorm:"index;not null" json:"evaluation_id"`
	MetricName    string    `gorm:"size:32;not null" json:"metric_name"`
	RawScore      float64   `gorm:"type:decimal(10,2)" json:"raw_score"`
	Weight        float64   `gorm:"type:decimal(6,4)" json:"weight"`
	WeightedScore float64   `gorm:"type:decimal(10,2)" json:"weighted_score"`
	Comment       string    `gorm:"size:255" json:"comment"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type AuditRecord struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	BatchID       uint      `gorm:"index;not null" json:"batch_id"`
	StageRecordID *uint     `gorm:"index" json:"stage_record_id,omitempty"`
	ReviewerID    uint      `gorm:"index;not null" json:"reviewer_id"`
	ReviewerName  string    `gorm:"size:128;not null" json:"reviewer_name"`
	Action        string    `gorm:"size:64;not null" json:"action"`
	Status        string    `gorm:"size:32;not null" json:"status"`
	Comment       string    `gorm:"type:text" json:"comment"`
	ReviewedAt    time.Time `gorm:"index" json:"reviewed_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type ConsumerFavorite struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	BatchID   uint      `gorm:"index;not null" json:"batch_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserFeedback struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"index;not null" json:"user_id"`
	BatchID     *uint     `gorm:"index" json:"batch_id,omitempty"`
	TraceCode   string    `gorm:"size:64;index" json:"trace_code"`
	Content     string    `gorm:"type:text;not null" json:"content"`
	ContactInfo string    `gorm:"size:255" json:"contact_info"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ConsumerQueryHistory struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      uint      `gorm:"index;not null" json:"user_id"`
	CodeQueried string    `gorm:"size:64;index;not null" json:"code_queried"`
	BatchID     *uint     `gorm:"index" json:"batch_id,omitempty"`
	BatchCode   string    `gorm:"size:64" json:"batch_code"`
	TraceCode   string    `gorm:"size:64" json:"trace_code"`
	QueriedAt   time.Time `gorm:"index" json:"queried_at"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}
