import _ from 'lodash'
import moment from 'moment'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import merge from 'deepmerge'
import chalk from 'chalk'

export function greet(name: string) {
  console.log(chalk.green(`Hello, ${_.capitalize(name)}!`))
}

export async function getData(url: string) {
  const { data } = await axios.get(url)
  return data
}

export function formatDate(date: Date) {
  return moment(date).format('YYYY-MM-DD')
}

export function generateId() {
  return uuidv4()
}

export function mergeConfigs(a: Record<string, unknown>, b: Record<string, unknown>) {
  return merge(a, b)
}
