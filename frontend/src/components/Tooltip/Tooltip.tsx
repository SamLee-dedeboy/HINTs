import * as d3 from "d3"
import { useState, useMemo, useEffect } from 'react'
import "./Tooltip.css"
import { tooltipContent } from "../../types"

interface TooltipProps {
  tooltipData: tooltipContent
  articleClusterColorDict: any,
  articleSubClusterColorDict: any,
  entityClusterColorDict: any,
  onItemClicked: (item: any) => void
}

function Tooltip({tooltipData, articleClusterColorDict, articleSubClusterColorDict, entityClusterColorDict, onItemClicked}: TooltipProps) {
  useEffect(() => {
    // console.log({tooltipData})
  }, [tooltipData])
  return (
    <>
      <div className='tooltip border-1 px-2 font-serif'>
        { tooltipData &&
          <div className='flex flex-col'>
            {
              !tooltipData.hovered &&
              <div className='topic-area flex flex-col'>
                <ul className='list-disc list-inside'> 
                  <p className='w-fit'> Topics: </p>
                  { tooltipData.sub_clusters!.map(sub_cluster => 
                    <li className='flex items-center pl-1 cursor-pointer hover:bg-gray-300 transition' key={sub_cluster.cluster_label} onClick={() => onItemClicked(sub_cluster)}> 
                      <span className='ml-2 text-left'> 
                        <svg className="inline" width='10' height='10'><rect width='10' height='10' opacity='0.5' fill={articleClusterColorDict[sub_cluster.cluster_label]}></rect></svg>
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
                <p className='flex text-lg cursor-pointer hover:bg-gray-300 transition' onClick={() => onItemClicked(tooltipData)}>
                  <span className=""> Topic: </span>
                  <span className="ml-2 text-left">
                    <svg className="inline" width='10' height='10'><rect width='10' height='10' opacity='0.5' fill={articleClusterColorDict[tooltipData.cluster_label]}></rect></svg>
                    <span> { tooltipData.cluster_topic } </span>
                  </span>
                </p>
                <ul className='list-disc list-inside'> 
                  <p className='w-fit'> Sub-topics: </p>
                  { tooltipData.sub_clusters!.map(sub_cluster => 
                    <li className='flex items-center pl-1 cursor-pointer hover:bg-gray-300 transition' key={sub_cluster.cluster_label} onClick={() => onItemClicked(sub_cluster)}> 
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
            {/* <ul className='list-disc list-inside'> 
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
            </ul> */}
          </div>
        }
      </div>
    </>
  )
}

export default Tooltip
