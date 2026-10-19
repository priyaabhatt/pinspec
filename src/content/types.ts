export interface Row {
  id: number
  prop: string
  before: string
  after: string
  /** Pass the typed value as-is instead of snapping to the system. */
  exact: boolean
}

export interface AfterImage {
  url: string
  img: HTMLImageElement
}
