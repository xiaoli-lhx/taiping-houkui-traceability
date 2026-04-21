package main

import (
	"log"

	"tea-traceability-system/internal/app"
)

func main() {
	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
