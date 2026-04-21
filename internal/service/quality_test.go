package service

import "testing"

func TestCalculateQualityScore(t *testing.T) {
	result, err := CalculateQualityScore([]MetricInput{
		{MetricName: "appearance", Score: 90},
		{MetricName: "color", Score: 88},
		{MetricName: "aroma", Score: 92},
		{MetricName: "taste", Score: 86},
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if result.Grade != "一级" {
		t.Fatalf("expected grade 一级, got %s", result.Grade)
	}

	if result.TotalScore <= 0 {
		t.Fatalf("expected positive score, got %f", result.TotalScore)
	}

	if len(result.RadarData) != 4 {
		t.Fatalf("expected 4 radar items, got %d", len(result.RadarData))
	}
}

func TestCalculateQualityScoreRejectsMissingMetric(t *testing.T) {
	_, err := CalculateQualityScore([]MetricInput{
		{MetricName: "appearance", Score: 90},
		{MetricName: "color", Score: 88},
		{MetricName: "aroma", Score: 92},
	})
	if err == nil {
		t.Fatal("expected error when metrics are incomplete")
	}
}
