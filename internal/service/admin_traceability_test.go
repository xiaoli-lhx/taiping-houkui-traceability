package service

import (
	"errors"
	"testing"

	"tea-traceability-system/internal/model"
)

func TestBuildRegistrationFilterDefaultsToPendingApproval(t *testing.T) {
	filter := buildRegistrationFilter("")

	if filter.ApprovalStatus != model.ApprovalPending {
		t.Fatalf("expected default approval status %q, got %q", model.ApprovalPending, filter.ApprovalStatus)
	}
	if filter.Status != "" {
		t.Fatalf("expected empty status filter, got %q", filter.Status)
	}
}

func TestBuildRegistrationFilterMapsDisabledToAccountStatus(t *testing.T) {
	filter := buildRegistrationFilter("disabled")

	if filter.Status != model.UserStatusDisabled {
		t.Fatalf("expected status filter %q, got %q", model.UserStatusDisabled, filter.Status)
	}
	if filter.ApprovalStatus != "" {
		t.Fatalf("expected empty approval status filter, got %q", filter.ApprovalStatus)
	}
}

func TestBuildRegistrationFilterKeepsApprovalStatuses(t *testing.T) {
	filter := buildRegistrationFilter(model.ApprovalRejected)

	if filter.ApprovalStatus != model.ApprovalRejected {
		t.Fatalf("expected approval status filter %q, got %q", model.ApprovalRejected, filter.ApprovalStatus)
	}
	if filter.Status != "" {
		t.Fatalf("expected empty status filter, got %q", filter.Status)
	}
}

func TestValidateRectificationResponseRejectsEmptyComment(t *testing.T) {
	err := validateRectificationResponse("   ")
	if !errors.Is(err, ErrRectificationResponseRequired) {
		t.Fatalf("expected ErrRectificationResponseRequired, got %v", err)
	}
}

func TestValidateRectificationResponseAcceptsNonEmptyComment(t *testing.T) {
	if err := validateRectificationResponse("已补充整改说明"); err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
}

func TestShouldBlockApprovalForOpenRectification(t *testing.T) {
	if !shouldBlockApprovalForOpenRectification(model.AuditStatusApproved, true) {
		t.Fatal("expected approval to be blocked when open rectification exists")
	}
	if shouldBlockApprovalForOpenRectification(model.AuditStatusRejected, true) {
		t.Fatal("did not expect rejected status to be blocked")
	}
	if shouldBlockApprovalForOpenRectification(model.AuditStatusApproved, false) {
		t.Fatal("did not expect approval to be blocked when no open rectification exists")
	}
}
