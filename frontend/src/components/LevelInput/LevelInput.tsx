import { Col, InputNumber, Row, Slider } from 'antd';


function LevelInput({inputValue, minValue, maxValue, onChange}) {
  return (
    <Row>
      <Col span={12}>
        <Slider
          min={minValue}
          max={maxValue}
          onChange={onChange}
          value={typeof inputValue === 'number' ? inputValue : 0}
        />
      </Col>
      <Col span={4}>
        <InputNumber
          min={minValue}
          max={maxValue}
          style={{ margin: '0 16px' }}
          value={inputValue}
          onChange={onChange}
        />
      </Col>
    </Row>
  );
}

export default LevelInput
