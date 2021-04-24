import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Calendar from "react-calendar";
import axios from "axios";
import moment from "moment";

import "react-calendar/dist/Calendar.css";

const createDateDisplay = (date) => {
  const month = date.getMonth() + 1;
  const monthDisplay = month >= 10 ? `${month}` : `0${month}`;
  const day = date.getDate();
  const dayDisplay = day >= 10 ? `${day}` : `0${day}`;

  return `${monthDisplay}.${dayDisplay}`;
};

const findIndexWithDate = (values, date) =>
  values.findIndex(
    (val) =>
      val.date.getMonth() === date.getMonth() &&
      val.date.getDate() === date.getDate()
  );

const InputForm = (props) => {
  const [inputNum, setInputNum] = useState(props.initialValue);

  useEffect(() => {
    if (props.initialValue) {
      setInputNum(props.initialValue);
    }
  }, [props.initialValue]);

  const handleChange = (event) => {
    setInputNum(event.target.value);
  };

  const handleSubmit = (event) => {
    props.onSubmit(parseFloat(inputNum));
    event.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        autoFocus
        type="text"
        value={inputNum}
        defaultValue={inputNum}
        onChange={handleChange}
        style={{ marginRight: "1em" }}
      />
      <input type="submit" value="Submit" />
    </form>
  );
};

const dateToDictKey = (date) => {
  return `${date.getFullYear()}.${date.getMonth()}.${date.getDate()}`;
};

const createTimeSeriesDict = (timeSeries) => {
  return timeSeries.reduce((dict, dataPoint) => {
    dict[dateToDictKey(dataPoint.date)] = dataPoint;
    return dict;
  }, Object.assign({}, null));
};

export default function App() {
  const [date, setDate] = useState(
    moment(new Date())
      .set({ hour: 12, minute: 0, second: 0, millisecond: 0 })
      .toDate()
  );
  const [windowSize, setWindowSize] = useState(3);

  const [timeSeries, setTimeSeries] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("http://localhost:4242/data");
      let data = await res.json();

      setTimeSeries(data.map((d) => ({ ...d, date: new Date(d.date) })));
    };

    fetchData();
  }, []);

  const valuesArray = timeSeries.map((dataPoint) => dataPoint.value);
  const minValue = Math.min(valuesArray);
  const maxValue = Math.max(valuesArray);
  const timeSeriesDict = createTimeSeriesDict(timeSeries);

  const halfWindow = Math.floor(windowSize / 2);
  for (let i = 0; i < timeSeries.length; i++) {
    const dataPointDate = timeSeries[i].date;
    let sum = timeSeriesDict[dateToDictKey(dataPointDate)].value;
    let count = 1;
    for (let j = 1; j <= halfWindow; j++) {
      const keyBack = dateToDictKey(
        moment(dataPointDate).subtract(j, "day").toDate()
      );
      const keyForward = dateToDictKey(
        moment(dataPointDate).add(j, "day").toDate()
      );

      if (timeSeriesDict[keyBack]) {
        sum += timeSeriesDict[keyBack].value;
        count++;
      }

      if (timeSeriesDict[keyForward]) {
        sum += timeSeriesDict[keyForward].value;
        count++;
      }
    }

    timeSeries[i].avg = sum / count;
  }

  const selectedDataPoint = timeSeries.find(
    (v) =>
      v.date.getFullYear() === date.getFullYear() &&
      v.date.getMonth() === date.getMonth() &&
      v.date.getDate() === date.getDate()
  );

  const selectedValue = selectedDataPoint ? selectedDataPoint.value : "";

  const handleNewInput = (newInput) => {
    const index = findIndexWithDate(timeSeries, date);
    const newDataPoints = timeSeries.map((element, i) => {
      if (i === index) {
        return { ...element, value: newInput };
      } else {
        return element;
      }
    });

    if (index === -1) {
      newDataPoints.push({
        value: newInput,
        date,
        dateDisplay: createDateDisplay(date),
      });
      newDataPoints.sort((a, b) =>
        a.date < b.date ? -1 : a.date == b.date ? 1 : 0
      );
    }

    axios
      .put("http://localhost:4242/data", { data: newDataPoints })
      .then((res) => {
        setTimeSeries(newDataPoints);
      });
  };

  const handleNewDateSelected = (d) => {
    setDate(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12));
  };

  return (
    <>
      <div style={{ marginBottom: "1em" }}>
        <Calendar value={date} onChange={handleNewDateSelected} />
      </div>
      <InputForm onSubmit={handleNewInput} initialValue={selectedValue} />
      <form>
        <input
          id="wSize"
          type="range"
          min="3"
          max="11"
          step="2"
          value={windowSize}
          onChange={(event) => setWindowSize(event.target.value)}
        />
        <label htmlFor="wSize">Window size: {windowSize}</label>
      </form>
      <ResponsiveContainer height={400}>
        <LineChart data={timeSeries}>
          <XAxis dataKey="dateDisplay" />
          <YAxis type="number" domain={[minValue, maxValue]} />
          <Legend />
          <Tooltip />
          <Line dataKey="value" type="monotone" stroke="#ff7300" />
          <Line dataKey="avg" type="monotone" stroke="#387908" />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
