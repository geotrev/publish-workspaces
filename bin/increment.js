#!/usr/bin/env node

import fs from "fs"
import path from "path"
import { exec } from "./helpers/exec-promise.js"
import { logErr, pkgReporter } from "./helpers/reporter.js"
import { ROOT_PACKAGE_FILE } from "./helpers/constants.js"

function setDependencies(config, entry) {
  pkgReporter.start("Increment co-dependencies")

  const { getPackage, dir } = entry
  const pkgContent = getPackage()
  const dependencies = []
  const types = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]

  types.forEach((type) => {
    if (!pkgContent[type]) return
    const packageNames = Object.keys(pkgContent[type])

    if (packageNames.length) {
      dependencies.push({ type, packageNames })
    }
  })

  if (dependencies.length) {
    dependencies.forEach(({ type, packageNames }) => {
      packageNames
        .filter((name) =>
          config.packageNames.some((pkgName) => pkgName === name)
        )
        .forEach((name) => {
          pkgContent[type][name] = `^${pkgContent.version}`
        })
    })

    const newPkgJson = JSON.stringify(pkgContent, null, 2)
    const writeCommand = `fs.writeFileSync(path.resolve(dir, "${ROOT_PACKAGE_FILE}"), newPkgJson, "utf8")`

    if (config.dryRun) {
      pkgReporter.info(writeCommand)
    } else {
      try {
        if (config.verbose) {
          pkgReporter.info(writeCommand)
        }

        fs.writeFileSync(
          path.resolve(dir, ROOT_PACKAGE_FILE),
          newPkgJson + "\n",
          "utf8"
        )
      } catch (e) {
        logErr(e, "Something went wrong updating package.json")
      }
    }

    pkgReporter.succeed("Co-dependencies updated")
  } else {
    pkgReporter.succeed("No co-dependencies detected")
  }
}

export async function runIncrement(config, entry, newVersion) {
  pkgReporter.start(`Bump ${entry.name} to v${newVersion}`)

  const incCommand = `npm version -w ${entry.name} ${newVersion} --no-git-tag-version`

  if (config.dryRun) {
    pkgReporter.info(incCommand)
  } else {
    try {
      if (config.verbose) {
        pkgReporter.info(incCommand)
      }

      await exec(incCommand)
    } catch (e) {
      logErr(e, "Something went wrong while versioning")
    }
  }

  setDependencies(config, entry)

  pkgReporter.succeed("Version successful")
}
