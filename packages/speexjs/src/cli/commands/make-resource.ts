import { colors } from '../../native/colors.js'
import { makeController } from './make-controller.js'
import { makeModel } from './make-model.js'
import { makeMigration } from './make-migration.js'

export function makeResource(name: string): void {
  console.log(`  ${colors.cyan('→')} Generating resource: ${name}...`)
  makeController(name)
  makeModel(name)
  makeMigration(`create_${name}_table`)
  console.log(`  ${colors.green('✓')} Resource ${name} created: controller + model + migration`)
}
