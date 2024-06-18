import { useState, useEffect, useMemo, useRef } from 'react'
import { Checkbox } from 'antd';
import { InputNumber } from 'antd';


function Filters({communities, enabled_communities, onChange}) {
  const [first_init, setFirstInit] = useState<boolean>(true)
  const [community_size, setCommunitySize] = useState<number | null>(5)
  const [selected_communities, setSelectedCommunities] = useState<any[]>(enabled_communities)

  const community_checkbox_options = useMemo(() => {
    console.log({enabled_communities})
    const enabled = communities.filter(community => enabled_communities.includes(community))
    const disabled = communities.filter(community => !enabled_communities.includes(community))
    return (enabled.concat(disabled)).map(community => {
      return {
        label: community,
        value: community,
        disabled: !enabled_communities.includes(community)
      }
    })
  }, [communities, enabled_communities])

  function usePrevious(value) {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    });
    return ref.current;
  }

  useEffect(() => {
    console.log("selected_communities changed", {selected_communities}, first_init)
    if(first_init) {
      setFirstInit(false)
      return
    }
    onChange({
      community_size: community_size,
      selected_communities: selected_communities,
    })
  }, [community_size, selected_communities])


  return (
    <>
      <div className="filters-container">
        <div className='filters-header'>
          Filters
          <div className="community-size-filter">
            {
              <InputNumber min={1} defaultValue={5} onChange={setCommunitySize} />
            }
          </div>
          <div className="Communities">
            {
              <Checkbox.Group options={community_checkbox_options} defaultValue={selected_communities} onChange={setSelectedCommunities} />
            }
          </div>
        </div>
      </div>
    </>
  )
}

export default Filters
