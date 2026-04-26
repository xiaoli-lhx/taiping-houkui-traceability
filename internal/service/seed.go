package service

import (
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

type demoUserSeed struct {
	Username     string
	DisplayName  string
	Organization string
	RoleCode     string
}

type demoBatchSeed struct {
	BatchCode           string
	TraceCode           string
	ProductCode         string
	Origin              string
	FarmName            string
	EnterpriseName      string
	QuantityKg          float64
	HarvestDate         time.Time
	PackagingDate       time.Time
	PublicVisible       bool
	Status              string
	AuditStatus         string
	RectificationStatus string
	AuditComment        string
	Metrics             []MetricInput
	EvaluatedAt         time.Time
}

func SeedDemoData(db *gorm.DB, qualityService *QualityService) error {
	if err := seedRoles(db); err != nil {
		return err
	}

	users, err := seedUsers(db)
	if err != nil {
		return err
	}

	seeds := []demoBatchSeed{
		{
			BatchCode:           "HK202603-001",
			TraceCode:           "TRACE-HK202603-001",
			ProductCode:         "TPHK-001",
			Origin:              "安徽省黄山市黄山区猴坑村",
			FarmName:            "猴坑示范茶园",
			EnterpriseName:      "黄山猴魁茶业有限公司",
			QuantityKg:          120.5,
			HarvestDate:         time.Now().AddDate(0, 0, -15),
			PackagingDate:       time.Now().AddDate(0, 0, -10),
			PublicVisible:       true,
			Status:              model.BatchStatusCompleted,
			AuditStatus:         model.AuditStatusApproved,
			RectificationStatus: model.RectificationStatusNone,
			AuditComment:        "批次信息完整，允许公开查询。",
			Metrics: []MetricInput{
				{MetricName: "appearance", Score: 94, Comment: "两叶抱芽较匀整"},
				{MetricName: "color", Score: 91, Comment: "色泽翠绿润亮"},
				{MetricName: "aroma", Score: 93, Comment: "兰花香明显"},
				{MetricName: "taste", Score: 90, Comment: "滋味鲜爽回甘"},
			},
			EvaluatedAt: time.Now().AddDate(0, 0, -9),
		},
		{
			BatchCode:           "HK202603-002",
			TraceCode:           "TRACE-HK202603-002",
			ProductCode:         "TPHK-002",
			Origin:              "安徽省黄山市黄山区新明乡",
			FarmName:            "新明生态茶园",
			EnterpriseName:      "黄山猴魁茶业有限公司",
			QuantityKg:          88.0,
			HarvestDate:         time.Now().AddDate(0, 0, -12),
			PackagingDate:       time.Now().AddDate(0, 0, -7),
			PublicVisible:       true,
			Status:              model.BatchStatusCompleted,
			AuditStatus:         model.AuditStatusPending,
			RectificationStatus: model.RectificationStatusSubmitted,
			AuditComment:        "加工记录缺少批次封装说明，请整改后复审。",
			Metrics: []MetricInput{
				{MetricName: "appearance", Score: 74, Comment: "条索整齐度一般"},
				{MetricName: "color", Score: 70, Comment: "色泽均匀性不足"},
				{MetricName: "aroma", Score: 73, Comment: "香气表现偏弱"},
				{MetricName: "taste", Score: 71, Comment: "滋味鲜爽度有待提升"},
			},
			EvaluatedAt: time.Now().AddDate(0, 0, -6),
		},
	}

	for _, seed := range seeds {
		if err := seedDemoBatch(db, qualityService, seed, users); err != nil {
			return err
		}
	}

	return seedDemoFeedback(db, users)
}

func seedRoles(db *gorm.DB) error {
	roles := []model.Role{
		{Code: model.RoleAdmin, Name: "管理员", Description: "审核注册申请并维护系统用户"},
		{Code: model.RoleFarmer, Name: "茶农", Description: "录入种植和采摘信息"},
		{Code: model.RoleEnterprise, Name: "企业", Description: "维护加工包装流通信息并执行品质评估"},
		{Code: model.RoleRegulator, Name: "监管方", Description: "审核批次信息并查看统计分析"},
		{Code: model.RoleConsumer, Name: "消费者", Description: "查询公开溯源信息"},
	}

	for _, item := range roles {
		role := item
		if err := db.Where("code = ?", role.Code).FirstOrCreate(&role).Error; err != nil {
			return err
		}
	}
	return nil
}

func seedUsers(db *gorm.DB) (map[string]model.User, error) {
	seeds := []demoUserSeed{
		{Username: "admin_demo", DisplayName: "系统管理员", Organization: "平台管理中心", RoleCode: model.RoleAdmin},
		{Username: "farmer_demo", DisplayName: "汪师傅", Organization: "猴坑示范茶园", RoleCode: model.RoleFarmer},
		{Username: "enterprise_demo", DisplayName: "黄山茶企管理员", Organization: "黄山猴魁茶业有限公司", RoleCode: model.RoleEnterprise},
		{Username: "regulator_demo", DisplayName: "黄山区监管员", Organization: "黄山区茶产业监管中心", RoleCode: model.RoleRegulator},
		{Username: "consumer_demo", DisplayName: "消费者演示账号", Organization: "公众查询", RoleCode: model.RoleConsumer},
	}

	users := make(map[string]model.User, len(seeds))
	passwordHash, err := HashPassword("123456")
	if err != nil {
		return nil, err
	}

	for _, seed := range seeds {
		var user model.User
		if err := db.Where("username = ?", seed.Username).Limit(1).Find(&user).Error; err != nil {
			return nil, err
		}
		if user.ID == 0 {
			user = model.User{
				Username:       seed.Username,
				PasswordHash:   passwordHash,
				DisplayName:    seed.DisplayName,
				Organization:   seed.Organization,
				RoleCode:       seed.RoleCode,
				Status:         model.UserStatusActive,
				ApprovalStatus: model.ApprovalApproved,
			}
			if err := db.Create(&user).Error; err != nil {
				return nil, err
			}
		}
		if err := db.Model(&model.User{}).Where("id = ?", user.ID).Updates(map[string]any{
			"role_code":        seed.RoleCode,
			"status":           model.UserStatusActive,
			"approval_status":  model.ApprovalApproved,
			"rejection_reason": "",
		}).Error; err != nil {
			return nil, err
		}
		user.RoleCode = seed.RoleCode
		user.Status = model.UserStatusActive
		user.ApprovalStatus = model.ApprovalApproved
		if err := attachSingleRole(db, &user); err != nil {
			return nil, err
		}

		users[seed.Username] = user
	}

	return users, nil
}

func seedDemoBatch(db *gorm.DB, qualityService *QualityService, seed demoBatchSeed, users map[string]model.User) error {
	var batch model.TeaBatch
	if err := db.Where("batch_code = ?", seed.BatchCode).Limit(1).Find(&batch).Error; err != nil {
		return err
	}
	if batch.ID == 0 {
		batch = model.TeaBatch{
			BatchCode:           seed.BatchCode,
			TraceCode:           seed.TraceCode,
			ProductCode:         seed.ProductCode,
			TeaName:             "太平猴魁",
			TeaType:             "绿茶",
			Origin:              seed.Origin,
			FarmName:            seed.FarmName,
			EnterpriseName:      seed.EnterpriseName,
			QuantityKg:          seed.QuantityKg,
			HarvestDate:         &seed.HarvestDate,
			PackagingDate:       &seed.PackagingDate,
			Status:              seed.Status,
			AuditStatus:         seed.AuditStatus,
			RectificationStatus: seed.RectificationStatus,
			PublicVisible:       seed.PublicVisible,
			CreatedBy:           users["enterprise_demo"].ID,
		}
		if err := db.Create(&batch).Error; err != nil {
			return err
		}
	}
	if err := db.Model(&model.TeaBatch{}).Where("id = ?", batch.ID).Updates(map[string]any{
		"audit_status":         seed.AuditStatus,
		"rectification_status": seed.RectificationStatus,
		"public_visible":       seed.PublicVisible,
		"status":               seed.Status,
	}).Error; err != nil {
		return err
	}

	var stageCount int64
	if err := db.Model(&model.TraceStageRecord{}).Where("batch_id = ?", batch.ID).Count(&stageCount).Error; err != nil {
		return err
	}
	if stageCount == 0 {
		stages := []model.TraceStageRecord{
			{
				BatchID:      batch.ID,
				Stage:        model.StagePlanting,
				Sequence:     1,
				Title:        "茶园种植建档",
				Description:  "完成生态茶园管理与农事记录。",
				Location:     seed.Origin,
				OperatorID:   users["farmer_demo"].ID,
				OperatorName: users["farmer_demo"].DisplayName,
				OperatorRole: model.RoleFarmer,
				OccurredAt:   seed.HarvestDate.AddDate(0, 0, -20),
			},
			{
				BatchID:      batch.ID,
				Stage:        model.StagePicking,
				Sequence:     2,
				Title:        "鲜叶采摘",
				Description:  "按照一芽二叶标准进行分批采摘。",
				Location:     seed.Origin,
				OperatorID:   users["farmer_demo"].ID,
				OperatorName: users["farmer_demo"].DisplayName,
				OperatorRole: model.RoleFarmer,
				OccurredAt:   seed.HarvestDate,
			},
			{
				BatchID:      batch.ID,
				Stage:        model.StageProcessing,
				Sequence:     3,
				Title:        "杀青整形",
				Description:  "完成杀青、理条、烘焙等工序。",
				Location:     seed.EnterpriseName,
				OperatorID:   users["enterprise_demo"].ID,
				OperatorName: users["enterprise_demo"].DisplayName,
				OperatorRole: model.RoleEnterprise,
				OccurredAt:   seed.HarvestDate.AddDate(0, 0, 1),
			},
			{
				BatchID:      batch.ID,
				Stage:        model.StagePackaging,
				Sequence:     4,
				Title:        "成品包装",
				Description:  "完成批次封装并生成溯源码。",
				Location:     seed.EnterpriseName,
				OperatorID:   users["enterprise_demo"].ID,
				OperatorName: users["enterprise_demo"].DisplayName,
				OperatorRole: model.RoleEnterprise,
				OccurredAt:   seed.PackagingDate,
			},
			{
				BatchID:      batch.ID,
				Stage:        model.StageDistribution,
				Sequence:     5,
				Title:        "渠道流通",
				Description:  "进入区域经销渠道，支持消费者扫码查询。",
				Location:     "黄山市",
				OperatorID:   users["enterprise_demo"].ID,
				OperatorName: users["enterprise_demo"].DisplayName,
				OperatorRole: model.RoleEnterprise,
				OccurredAt:   seed.PackagingDate.AddDate(0, 0, 1),
			},
		}
		if err := db.Create(&stages).Error; err != nil {
			return err
		}
	}

	var evaluationCount int64
	if err := db.Model(&model.QualityEvaluation{}).Where("batch_id = ?", batch.ID).Count(&evaluationCount).Error; err != nil {
		return err
	}
	if evaluationCount == 0 {
		evaluatedAt := seed.EvaluatedAt
		if _, err := qualityService.CreateEvaluation(CreateQualityEvaluationInput{
			BatchID:     batch.ID,
			EvaluatorID: users["enterprise_demo"].ID,
			RuleVersion: "v1",
			Metrics:     seed.Metrics,
			EvaluatedAt: &evaluatedAt,
		}); err != nil {
			return err
		}
	}

	var auditCount int64
	if err := db.Model(&model.AuditRecord{}).Where("batch_id = ?", batch.ID).Count(&auditCount).Error; err != nil {
		return err
	}
	var lastAudit model.AuditRecord
	if auditCount == 0 {
		auditStatus := seed.AuditStatus
		auditAction := "initial_review"
		if seed.RectificationStatus != model.RectificationStatusNone {
			auditStatus = model.AuditStatusRejected
			auditAction = "issue_review"
		}
		audit := model.AuditRecord{
			BatchID:      batch.ID,
			ReviewerID:   users["regulator_demo"].ID,
			ReviewerName: users["regulator_demo"].DisplayName,
			Action:       auditAction,
			Status:       auditStatus,
			Comment:      seed.AuditComment,
			ReviewedAt:   seed.PackagingDate.AddDate(0, 0, 1),
		}
		if err := db.Create(&audit).Error; err != nil {
			return err
		}
		lastAudit = audit
	} else {
		if err := db.Where("batch_id = ?", batch.ID).Order("reviewed_at DESC, id DESC").First(&lastAudit).Error; err != nil {
			return err
		}
	}

	if seed.RectificationStatus != model.RectificationStatusNone {
		if err := seedRectificationTask(db, batch.ID, seed, users, &lastAudit); err != nil {
			return err
		}
	}

	return nil
}

func seedRectificationTask(db *gorm.DB, batchID uint, seed demoBatchSeed, users map[string]model.User, sourceAudit *model.AuditRecord) error {
	var taskCount int64
	if err := db.Model(&model.RectificationTask{}).Where("batch_id = ?", batchID).Count(&taskCount).Error; err != nil {
		return err
	}
	if taskCount > 0 {
		return db.Model(&model.RectificationTask{}).Where("batch_id = ?", batchID).Updates(map[string]any{
			"status": seed.RectificationStatus,
		}).Error
	}

	var stage model.TraceStageRecord
	if err := db.Where("batch_id = ? AND stage = ?", batchID, model.StagePackaging).First(&stage).Error; err != nil {
		return err
	}

	submittedAt := seed.PackagingDate.AddDate(0, 0, 2)
	task := model.RectificationTask{
		BatchID:         batchID,
		StageRecordID:   &stage.ID,
		SourceAuditID:   sourceAudit.ID,
		ResponsibleRole: model.RoleEnterprise,
		Status:          seed.RectificationStatus,
		IssueSummary:    seed.AuditComment,
		RequiredAction:  "请补充包装阶段说明并重新提交监管复审。",
		ReviewerComment: seed.AuditComment,
	}
	if seed.RectificationStatus == model.RectificationStatusSubmitted {
		submittedBy := users["enterprise_demo"].ID
		task.ResponseComment = "已补充包装批次封装说明和台账截图，请监管复审。"
		task.SubmittedBy = &submittedBy
		task.SubmittedAt = &submittedAt
	}

	return db.Create(&task).Error
}

func seedDemoFeedback(db *gorm.DB, users map[string]model.User) error {
	var batch model.TeaBatch
	if err := db.Where("batch_code = ?", "HK202603-002").First(&batch).Error; err != nil {
		return err
	}

	var count int64
	if err := db.Model(&model.UserFeedback{}).Where("batch_id = ?", batch.ID).Count(&count).Error; err != nil {
		return err
	}
	if count >= 3 {
		return nil
	}

	feedbacks := []model.UserFeedback{
		{
			UserID:      users["consumer_demo"].ID,
			BatchID:     &batch.ID,
			TraceCode:   batch.TraceCode,
			Content:     "查询信息里包装说明较少，希望补充更完整的工艺介绍。",
			ContactInfo: "consumer_demo",
			Status:      model.FeedbackStatusPending,
		},
		{
			UserID:      users["consumer_demo"].ID,
			BatchID:     &batch.ID,
			TraceCode:   batch.TraceCode,
			Content:     "该批次品质评分偏低，想了解是否已经整改。",
			ContactInfo: "consumer_demo",
			Status:      model.FeedbackStatusProcessing,
		},
		{
			UserID:      users["consumer_demo"].ID,
			BatchID:     &batch.ID,
			TraceCode:   batch.TraceCode,
			Content:     "希望增加加工环节的图片或凭证说明。",
			ContactInfo: "consumer_demo",
			Status:      model.FeedbackStatusPending,
		},
	}

	return db.Create(&feedbacks).Error
}
