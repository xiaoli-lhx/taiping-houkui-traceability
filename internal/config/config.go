package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	AppName                  string
	AppEnv                   string
	ServerAddr               string
	JWTSecret                string
	MySQLDSN                 string
	AutoMigrate              bool
	SeedDemo                 bool
	DBMaxIdleConns           int
	DBMaxOpenConns           int
	DBConnMaxLifetimeMinutes int
	TokenTTL                 time.Duration
}

func Load() Config {
	_ = godotenv.Load()

	return Config{
		AppName:                  getEnv("APP_NAME", "tea-traceability-system"),
		AppEnv:                   getEnv("APP_ENV", "dev"),
		ServerAddr:               getEnv("SERVER_ADDR", ":8080"),
		JWTSecret:                getEnv("JWT_SECRET", "change-me-in-production"),
		MySQLDSN:                 getEnv("MYSQL_DSN", ""),
		AutoMigrate:              getEnvBool("AUTO_MIGRATE", true),
		SeedDemo:                 getEnvBool("SEED_DEMO", true),
		DBMaxIdleConns:           getEnvInt("DB_MAX_IDLE_CONNS", 10),
		DBMaxOpenConns:           getEnvInt("DB_MAX_OPEN_CONNS", 20),
		DBConnMaxLifetimeMinutes: getEnvInt("DB_CONN_MAX_LIFETIME_MINUTES", 30),
		TokenTTL:                 24 * time.Hour,
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}
