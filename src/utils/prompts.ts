import prompts from 'prompts'

export async function promptText(message: string, initial?: string): Promise<string> {
  const response = await prompts({
    type: 'text',
    name: 'value',
    message,
    initial
  })
  return response.value || ''
}

export async function promptConfirm(message: string, initial = true): Promise<boolean> {
  const response = await prompts({
    type: 'confirm',
    name: 'value',
    message,
    initial
  })
  return response.value ?? initial
}

export async function promptSelect(message: string, choices: { title: string, value: string }[]): Promise<string> {
  const response = await prompts({
    type: 'select',
    name: 'value',
    message,
    choices
  })
  return response.value || choices[0]?.value || ''
}

export async function promptMultiselect(message: string, choices: { title: string, value: string }[]): Promise<string[]> {
  const response = await prompts({
    type: 'multiselect',
    name: 'value',
    message,
    choices
  })
  return response.value || []
}
