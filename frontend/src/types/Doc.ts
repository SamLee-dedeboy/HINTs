export type tDocument = {
    id: string,
    title: string,
    summary: string,
    entity_spans: tSpan[],
    relevance? : number
    highlight? : boolean
}
// export type tMention = {
//     entity_id: string,
//     entity_title: string,
//     spans: tSpan[]
//     text: string
// }

export type tSpan = [number, number, string]