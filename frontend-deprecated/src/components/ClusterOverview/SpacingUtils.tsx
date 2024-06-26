const spacing = {
  evenGaps(clusters,total_volume, total_spaces) {
    let gaps: number[] = []
    let accumulative_gap: number = 0
    // generate cluster gaps
    Object.keys(clusters).forEach(cluster_label => {
      const cluster_volume = clusters[cluster_label].length
      const ratio = cluster_volume / total_volume
      const cluster_space = total_spaces * ratio
      const padding = (cluster_space - cluster_volume)/2
      gaps.push(Math.floor(accumulative_gap + padding))
      accumulative_gap += 2*padding
    })
    return gaps
  },

  evenGaps_dep(clusters, cluster_order, total_volume, total_cluster_gap) {
    total_volume = 2*total_volume - clusters[cluster_order[0]].length - clusters[cluster_order[cluster_order.length-1]].length
    let gaps: number[] = [0]
    let accumulative_gap = 0
    // generate cluster gaps
    for(let i = 0; i < cluster_order.length-1; i++) {
      const cluster1 = cluster_order[i]
      const cluster2 = cluster_order[i+1]
      const cluster1_volume = clusters[cluster1].length
      const cluster2_volume = clusters[cluster2].length
      const volume_ratio = (cluster1_volume + cluster2_volume) / total_volume
      const gap_num = total_cluster_gap * volume_ratio
      accumulative_gap += Math.round(gap_num)
      gaps.push(accumulative_gap)
    }
    return gaps
  },

  centerGaps(clusters, cluster_order, total_volume, total_cluster_gap, padding) {
    total_volume = 2*total_volume
    const remain_cluster_gap = total_cluster_gap - padding
    let gaps: number[] = [padding / 2]
    let accumulative_gap = 0
    for(let i = 0; i < cluster_order.length-1; i++) {
      const cluster1 = cluster_order[i]
      const cluster2 = cluster_order[i+1]
      const cluster1_volume = clusters[cluster1].length
      const cluster2_volume = clusters[cluster2].length
      const volume_ratio = (cluster1_volume + cluster2_volume) / total_volume
      const gap_num = remain_cluster_gap * volume_ratio
      accumulative_gap += Math.round(gap_num)
      gaps.push(accumulative_gap)
    }
    return gaps
  }
}

export default spacing;