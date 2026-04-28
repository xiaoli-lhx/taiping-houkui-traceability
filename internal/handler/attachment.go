package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"tea-traceability-system/internal/service"
	"tea-traceability-system/pkg/responsex"
)

type AttachmentHandler struct {
	attachmentService *service.AttachmentService
}

func NewAttachmentHandler(attachmentService *service.AttachmentService) *AttachmentHandler {
	return &AttachmentHandler{attachmentService: attachmentService}
}

func (h *AttachmentHandler) List(c *gin.Context) {
	bizID, err := parseUintQuery(c.Query("biz_id"))
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "biz_id 格式错误")
		return
	}
	bizType := strings.TrimSpace(c.Query("biz_type"))
	if bizType == "" {
		responsex.Fail(c, http.StatusBadRequest, "biz_type 不能为空")
		return
	}

	items, err := h.attachmentService.List(service.AttachmentListFilter{
		BizType: bizType,
		BizID:   bizID,
	}, currentOperator(c))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "业务对象不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	responsex.Success(c, items)
}

func (h *AttachmentHandler) Create(c *gin.Context) {
	bizID, err := parseUintQuery(c.PostForm("biz_id"))
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "biz_id 格式错误")
		return
	}
	bizType := strings.TrimSpace(c.PostForm("biz_type"))
	if bizType == "" {
		responsex.Fail(c, http.StatusBadRequest, "biz_type 不能为空")
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "附件文件不能为空")
		return
	}

	item, err := h.attachmentService.Create(service.AttachmentCreateInput{
		BizType:  bizType,
		BizID:    bizID,
		File:     file,
		Operator: currentOperator(c),
	})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "业务对象不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	responsex.Created(c, item)
}

func (h *AttachmentHandler) Delete(c *gin.Context) {
	attachmentID, err := parseUintParam(c, "id")
	if err != nil {
		responsex.Fail(c, http.StatusBadRequest, "附件 ID 格式错误")
		return
	}
	if err := h.attachmentService.Delete(attachmentID, currentOperator(c)); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			responsex.Fail(c, http.StatusNotFound, "附件不存在")
			return
		}
		responsex.Fail(c, http.StatusBadRequest, err.Error())
		return
	}
	responsex.Success(c, gin.H{"deleted": true})
}
