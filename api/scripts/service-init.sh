#!/bin/bash

PROJECT_ROOT="${NX_WORKSPACE_ROOT}/${NX_PROJECT_ROOT}"

if ! [ -f $PROJECT_ROOT/.env ]; then
  touch $PROJECT_ROOT/.env
  echo "# OVERRIDE VARIABLES HERE" >> $PROJECT_ROOT/.env
fi
