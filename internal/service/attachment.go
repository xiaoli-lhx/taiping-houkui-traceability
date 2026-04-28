package service

import (
	"errors"
	"fmt"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"time"

	"gorm.io/gorm"

	"tea-traceability-system/internal/model"
)

type AttachmentService struct {
	db *gorm.DB
}

type AttachmentListFilter struct {
	BizType string
	BizID   uint
}

type AttachmentCreateInput struct {
	BizType  string
	BizID    uint
	File     *multipart.FileHeader
	Operator OperatorContext
}

func NewAttachmentService(db *gorm.DB) *AttachmentService {
	return &AttachmentService{db: db}
}

func (s *AttachmentService) List(filter AttachmentListFilter, operator OperatorContext) ([]model.Attachment, error) {
	if err := s.ensureAttachmentAccess(filter.BizType, filter.BizID, operator, false); err != nil {
		return nil, err
	}

	var items []model.Attachment
	if err := s.db.Where("biz_type = ? AND biz_id = ?", strings.TrimSpace(filter.BizType), filter.BizID).Order("created_at DESC, id DESC").Find(&items).Error; err != nil {
		return nil, err
	}
	return items, nil
}

func (s *AttachmentService) Create(input AttachmentCreateInput) (*model.Attachment, error) {
	if input.File == nil {
		return nil, errors.New("附件文件不能为空")
	}
	if err := s.ensureAttachmentAccess(input.BizType, input.BizID, input.Operator, true); err != nil {
		return nil, err
	}

	relativePath, storedName, err := saveAttachmentFile(input.BizType, input.File)
	if err != nil {
		return nil, err
	}

	attachment := model.Attachment{
		BizType:      strings.TrimSpace(input.BizType),
		BizID:        input.BizID,
		FileName:     input.File.Filename,
		StoredName:   storedName,
		RelativePath: filepath.ToSlash(relativePath),
		MimeType:     input.File.Header.Get("Content-Type"),
		FileSize:     input.File.Size,
		UploadedBy:   input.Operator.UserID,
		CreatedAt:    time.Now(),
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&attachment).Error; err != nil {
			return err
		}
		return logOperationTx(tx, OperationLogCreateInput{
			ActorID:    input.Operator.UserID,
			ActorRole:  input.Operator.PrimaryRole(),
			Action:     "upload_attachment",
			TargetType: model.LogTargetAttachment,
			TargetID:   attachment.ID,
			Summary:    "上传了业务附件",
			Detail: map[string]any{
				"biz_type":  attachment.BizType,
				"biz_id":    attachment.BizID,
				"file_name": attachment.FileName,
			},
		})
	}); err != nil {
		_ = os.Remove(filepath.Join(UploadRootDir, relativePath))
		return nil, err
	}

	return &attachment, nil
}

func (s *AttachmentService) Delete(id uint, operator OperatorContext) error {
	var attachment model.Attachment
	if err := s.db.First(&attachment, id).Error; err != nil {
		return err
	}
	if err := s.ensureAttachmentAccess(attachment.BizType, attachment.BizID, operator, true); err != nil {
		return err
	}

	relativePath := attachment.RelativePath
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Delete(&model.Attachment{}, id).Error; err != nil {
			return err
		}
		if err := logOperationTx(tx, OperationLogCreateInput{
			ActorID:    operator.UserID,
			ActorRole:  operator.PrimaryRole(),
			Action:     "delete_attachment",
			TargetType: model.LogTargetAttachment,
			TargetID:   id,
			Summary:    "删除了业务附件",
			Detail: map[string]any{
				"biz_type":  attachment.BizType,
				"biz_id":    attachment.BizID,
				"file_name": attachment.FileName,
			},
		}); err != nil {
			return err
		}
		if relativePath != "" {
			_ = os.Remove(filepath.Join(UploadRootDir, filepath.FromSlash(relativePath)))
		}
		return nil
	})
}

func (s *AttachmentService) ensureAttachmentAccess(bizType string, bizID uint, operator OperatorContext, canWrite bool) error {
	switch strings.TrimSpace(bizType) {
	case model.AttachmentBizTraceStage:
		var stage model.TraceStageRecord
		if err := s.db.First(&stage, bizID).Error; err != nil {
			return err
		}
		var batch model.TeaBatch
		if err := s.db.First(&batch, stage.BatchID).Error; err != nil {
			return err
		}
		traceService := NewTraceService(s.db)
		if !traceService.CanAccessBatch(&batch, operator) {
			return errors.New("当前账号无权访问该阶段附件")
		}
		if canWrite && !canManageStage(operator.PrimaryRole(), stage.Stage) {
			return errors.New("当前账号无权上传或删除该阶段附件")
		}
		return nil
	case model.AttachmentBizAuditRecord:
		var audit model.AuditRecord
		if err := s.db.First(&audit, bizID).Error; err != nil {
			return err
		}
		var batch model.TeaBatch
		if err := s.db.First(&batch, audit.BatchID).Error; err != nil {
			return err
		}
		traceService := NewTraceService(s.db)
		if !traceService.CanAccessBatch(&batch, operator) {
			return errors.New("当前账号无权访问该审核附件")
		}
		if canWrite && operator.PrimaryRole() != model.RoleRegulator {
			return errors.New("当前账号无权上传或删除该审核附件")
		}
		return nil
	case model.AttachmentBizRectificationTask:
		var task model.RectificationTask
		if err := s.db.First(&task, bizID).Error; err != nil {
			return err
		}
		var batch model.TeaBatch
		if err := s.db.First(&batch, task.BatchID).Error; err != nil {
			return err
		}
		traceService := NewTraceService(s.db)
		if !traceService.CanAccessBatch(&batch, operator) {
			return errors.New("当前账号无权访问该整改附件")
		}
		if canWrite && operator.PrimaryRole() != task.ResponsibleRole {
			return errors.New("当前账号无权上传或删除该整改附件")
		}
		return nil
	default:
		return errors.New("附件业务类型不支持")
	}
}

func saveAttachmentFile(bizType string, file *multipart.FileHeader) (string, string, error) {
	subdir := strings.TrimSpace(bizType)
	directory := filepath.Join(UploadRootDir, subdir)
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return "", "", err
	}

	src, err := file.Open()
	if err != nil {
		return "", "", err
	}
	defer src.Close()

	extension := filepath.Ext(file.Filename)
	storedName := fmt.Sprintf("%s_%d%s", strings.TrimSpace(bizType), time.Now().UnixNano(), extension)
	relativePath := filepath.Join(subdir, storedName)
	dst, err := os.Create(filepath.Join(UploadRootDir, relativePath))
	if err != nil {
		return "", "", err
	}
	defer dst.Close()

	if _, err := dst.ReadFrom(src); err != nil {
		return "", "", err
	}

	return filepath.ToSlash(relativePath), storedName, nil
}
