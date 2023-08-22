import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import "./Tooltip.css"
import { tooltipContent } from "../../types"

interface TooltipProps {
  tooltipData: tooltipContent
  articleClusterColorDict: any,
  articleSubClusterColorDict: any,
  entityClusterColorDict: any,
}

function Tooltip({tooltipData, articleClusterColorDict, articleSubClusterColorDict, entityClusterColorDict}: TooltipProps) {
  useEffect(() => {
    console.log({tooltipData})
  }, [tooltipData])
  return (
    <>
      <div className='tooltip border-1 p-0.5 text-sm'>
        { tooltipData &&
          <div className='flex flex-col'>
            {
              !tooltipData.hovered &&
              <div className='topic-area flex flex-col'>
                <ul className='list-disc list-inside'> 
                  <p className='w-fit'> Topics: </p>
                  { tooltipData.sub_clusters!.map(sub_cluster => 
                    <li className='flex items-center pl-1' key={sub_cluster.cluster_label}> 
                      <span className='ml-2 text-left'> 
                        <svg className="inline" width='10' height='10'><rect width='10' height='10' fill={articleClusterColorDict[sub_cluster.cluster_label]}></rect></svg>
                        <span> { sub_cluster.cluster_topic } </span>
                      </span>
                    </li> 
                    )
                  }
                </ul>
              </div>
            }
            {
              tooltipData.hovered &&
              <div className='topic-area flex flex-col'>
                <p className='flex items-center'>
                  <span className='mr-2'> Topic: </span>
                  <svg width='10' height='10'><rect width='10' height='10' fill={articleClusterColorDict[tooltipData.cluster_label]}></rect></svg>
                  <span className='ml-2'> { tooltipData.cluster_topic } </span>
                </p>
                <ul className='list-disc list-inside'> 
                  <p className='w-fit'> Sub-topics: </p>
                  { tooltipData.sub_clusters!.map(sub_cluster => 
                    <li className='flex items-center pl-1' key={sub_cluster.cluster_label}> 
                      <span className='ml-2 text-left'> 
                        <svg className="inline" width='10' height='10'><rect width='10' height='10' fill={articleSubClusterColorDict[sub_cluster.cluster_label]}></rect></svg>
                        <span> { sub_cluster.cluster_topic } </span>
                      </span>
                    </li> 
                    )
                  }
                </ul>
              </div>
            }
            <ul className='list-disc list-inside'> 
              <p className='w-fit'> Entities: </p>
              { Object.keys(tooltipData.entity_clusters).map(entity_cluster => 
                <li className='flex items-center pl-1 border-b border-grey' key={entity_cluster}> 
                  <span className='ml-2 text-left'>
                    <svg className='inline' width='10' height='10'><rect width='10' height='10' x='0' y='0' fill={entityClusterColorDict[entity_cluster]}></rect></svg>
                    { tooltipData.entity_clusters[entity_cluster].map(entity =>
                        <span className='ml-2 text-sm' key={entity}> { entity }, </span>
                      )
                    }
                  </span>
                </li> 
                )
              }
            </ul>
          </div>
        }
      </div>
    </>
  )
}

export default Tooltip
