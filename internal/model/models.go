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

	RectificationStatusNone              = "none"
	RectificationStatusPendingSubmission = "pending_submission"
	RectificationStatusSubmitted         = "submitted"
	RectificationStatusCompleted         = "completed"

	FeedbackStatusPending    = "pending"
	FeedbackStatusProcessing = "processing"
	FeedbackStatusResolved   = "resolved"

	AttachmentBizTraceStage        = "trace_stage"
	AttachmentBizAuditRecord       = "audit_record"
	AttachmentBizRectificationTask = "rectification_task"

	NotificationCategoryRegistrationReview  = "registration_review"
	NotificationCategoryFeedbackTicket      = "feedback_ticket"
	NotificationCategoryRectificationTask   = "rectification_task"
	NotificationCategoryRectificationReview = "rectification_review"
	NotificationCategorySystemNotice        = "system_notice"

	LogTargetUserProfile       = "user_profile"
	LogTargetUserAccount       = "user_account"
	LogTargetAuditRecord       = "audit_record"
	LogTargetRectificationTask = "rectification_task"
	LogTargetFeedbackTicket    = "feedback_ticket"
	LogTargetAttachment        = "attachment"

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
	AvatarURL       string     `gorm:"size:255" json:"avatar_url"`
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
	ID                  uint                `gorm:"primaryKey" json:"id"`
	BatchCode           string              `gorm:"size:64;uniqueIndex;not null" json:"batch_code"`
	TraceCode           string              `gorm:"size:64;uniqueIndex;not null" json:"trace_code"`
	ProductCode         string              `gorm:"size:64;index" json:"product_code"`
	TeaName             string              `gorm:"size:128;not null" json:"tea_name"`
	TeaType             string              `gorm:"size:64;not null" json:"tea_type"`
	Origin              string              `gorm:"size:128;not null" json:"origin"`
	FarmName            string              `gorm:"size:128" json:"farm_name"`
	EnterpriseName      string              `gorm:"size:128" json:"enterprise_name"`
	QuantityKg          float64             `gorm:"type:decimal(10,2)" json:"quantity_kg"`
	HarvestDate         *time.Time          `json:"harvest_date,omitempty"`
	PackagingDate       *time.Time          `json:"packaging_date,omitempty"`
	Status              string              `gorm:"size:32;default:draft" json:"status"`
	AuditStatus         string              `gorm:"size:32;default:pending" json:"audit_status"`
	RectificationStatus string              `gorm:"size:32;default:none" json:"rectification_status"`
	LatestGrade         string              `gorm:"size:32" json:"latest_grade"`
	PublicVisible       bool                `gorm:"default:true" json:"public_visible"`
	Notes               string              `gorm:"type:text" json:"notes"`
	CreatedBy           uint                `gorm:"index" json:"created_by"`
	StageRecords        []TraceStageRecord  `gorm:"foreignKey:BatchID" json:"stage_records,omitempty"`
	QualityEvaluations  []QualityEvaluation `gorm:"foreignKey:BatchID" json:"quality_evaluations,omitempty"`
	AuditRecords        []AuditRecord       `gorm:"foreignKey:BatchID" json:"audit_records,omitempty"`
	RectificationTasks  []RectificationTask `gorm:"foreignKey:BatchID" json:"rectification_tasks,omitempty"`
	CreatedAt           time.Time           `json:"created_at"`
	UpdatedAt           time.Time           `json:"updated_at"`
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

type RectificationTask struct {
	ID              uint              `gorm:"primaryKey" json:"id"`
	BatchID         uint              `gorm:"index;not null" json:"batch_id"`
	StageRecordID   *uint             `gorm:"index" json:"stage_record_id,omitempty"`
	SourceAuditID   uint              `gorm:"index;not null" json:"source_audit_id"`
	ResponsibleRole string            `gorm:"size:32;index;not null" json:"responsible_role"`
	Status          string            `gorm:"size:32;index;default:pending_submission" json:"status"`
	IssueSummary    string            `gorm:"type:text" json:"issue_summary"`
	RequiredAction  string            `gorm:"type:text" json:"required_action"`
	ResponseComment string            `gorm:"type:text" json:"response_comment"`
	ReviewerComment string            `gorm:"type:text" json:"reviewer_comment"`
	SubmittedBy     *uint             `gorm:"index" json:"submitted_by,omitempty"`
	SubmittedAt     *time.Time        `json:"submitted_at,omitempty"`
	ReviewedBy      *uint             `gorm:"index" json:"reviewed_by,omitempty"`
	ReviewedAt      *time.Time        `json:"reviewed_at,omitempty"`
	Batch           *TeaBatch         `gorm:"foreignKey:BatchID" json:"batch,omitempty"`
	StageRecord     *TraceStageRecord `gorm:"foreignKey:StageRecordID" json:"stage_record,omitempty"`
	SourceAudit     *AuditRecord      `gorm:"foreignKey:SourceAuditID" json:"source_audit,omitempty"`
	CreatedAt       time.Time         `json:"created_at"`
	UpdatedAt       time.Time         `json:"updated_at"`
}

type ConsumerFavorite struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index;not null" json:"user_id"`
	BatchID   uint      `gorm:"index;not null" json:"batch_id"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type UserFeedback struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	UserID      uint       `gorm:"index;not null" json:"user_id"`
	BatchID     *uint      `gorm:"index" json:"batch_id,omitempty"`
	TraceCode   string     `gorm:"size:64;index" json:"trace_code"`
	Content     string     `gorm:"type:text;not null" json:"content"`
	ContactInfo string     `gorm:"size:255" json:"contact_info"`
	Status      string     `gorm:"size:32;index;default:pending" json:"status"`
	ProcessNote string     `gorm:"type:text" json:"process_note"`
	ProcessedBy *uint      `gorm:"index" json:"processed_by,omitempty"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
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

type Attachment struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	BizType      string    `gorm:"size:64;index;not null" json:"biz_type"`
	BizID        uint      `gorm:"index;not null" json:"biz_id"`
	FileName     string    `gorm:"size:255;not null" json:"file_name"`
	StoredName   string    `gorm:"size:255;not null" json:"stored_name"`
	RelativePath string    `gorm:"size:255;not null" json:"relative_path"`
	MimeType     string    `gorm:"size:128" json:"mime_type"`
	FileSize     int64     `json:"file_size"`
	UploadedBy   uint      `gorm:"index;not null" json:"uploaded_by"`
	CreatedAt    time.Time `json:"created_at"`
}

type OperationLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ActorID    uint      `gorm:"index;not null" json:"actor_id"`
	ActorRole  string    `gorm:"size:32;index;not null" json:"actor_role"`
	Action     string    `gorm:"size:64;index;not null" json:"action"`
	TargetType string    `gorm:"size:64;index;not null" json:"target_type"`
	TargetID   uint      `gorm:"index;not null" json:"target_id"`
	Summary    string    `gorm:"size:255;not null" json:"summary"`
	DetailJSON string    `gorm:"type:text" json:"detail_json"`
	CreatedAt  time.Time `json:"created_at"`
}

type Notification struct {
	ID        uint       `gorm:"primaryKey" json:"id"`
	UserID    uint       `gorm:"index;not null" json:"user_id"`
	Category  string     `gorm:"size:64;index;not null" json:"category"`
	Title     string     `gorm:"size:255;not null" json:"title"`
	Content   string     `gorm:"type:text" json:"content"`
	Link      string     `gorm:"size:255" json:"link"`
	IsRead    bool       `gorm:"index;default:false" json:"is_read"`
	CreatedAt time.Time  `json:"created_at"`
	ReadAt    *time.Time `json:"read_at,omitempty"`
}
