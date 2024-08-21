import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./LPGMonitor.css";

// decrease indicates a sale
// increase indicates a refill
const tankLevels = {
  "8:59 AM": 9500,
  "9:00 AM": 9400,
  "9:01 AM": 9300,
  "9:02 AM": 9300,
  "9:03 AM": 9200,
  "9:10 AM": 9600,
  "9:15 AM": 9600,
  "9:30 AM": 9400,
  "10:00 AM": 9300,
  "10:15 AM": 9300,
  "11:00 AM": 8700,
  "11:30 AM": 8600,
  "12:00 PM": 8500,
  "12:01 PM": 8500,
};

const parseTime = (timeString) => {
  const [time, period] = timeString.split(" ");
  const [hours, minutes] = time.split(":");
  let date = new Date();
  date.setHours(
    period === "PM" ? (parseInt(hours) % 12) + 12 : parseInt(hours) % 12
  );
  date.setMinutes(parseInt(minutes));
  date.setSeconds(0);
  return date;
};

const calculateTotalInTimeRange = (data, startTime, endTime) => {
  let totalSold = 0;
  let totalRefill = 0;
  let refillCount = 0;

  const filteredData = Object.entries(data)
    .map(([time, level]) => ({
      time,
      level,
      date: parseTime(time),
    }))
    .filter(({ date }) => date >= startTime && date <= endTime)
    .map(({ time, level, date }, index, arr) => {
      let change = "";
      if (index > 0) {
        const prevLevel = arr[index - 1].level;
        change =
          level < prevLevel
            ? "Sale"
            : level > prevLevel
            ? "Refill"
            : "No change";
        if (change === "Sale") {
          totalSold += prevLevel - level;
        } else if (change === "Refill") {
          totalRefill += level - prevLevel;
          refillCount++;
        }
      }
      return { time, level, change };
    });

  return { filteredData, totalSold, totalRefill, refillCount };
};

const LPGMonitor = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [dataToShow, setDataToShow] = useState([]);
  const [totalSold, setTotalSold] = useState(null);
  const [totalRefill, setTotalRefill] = useState(null);
  const [refillCount, setRefillCount] = useState(null);
  const [showFiltered, setShowFiltered] = useState(false);
  const [filterType, setFilterType] = useState(null);

  const handleCalculate = (type) => {
    if (startDate && endDate) {
      const { filteredData, totalSold, totalRefill, refillCount } =
        calculateTotalInTimeRange(tankLevels, startDate, endDate);
      setDataToShow(filteredData);
      setTotalSold(totalSold);
      setTotalRefill(totalRefill);
      setRefillCount(refillCount);
      setShowFiltered(true);
      setFilterType(type);
    }
  };

  const handleReset = () => {
    setStartDate(null);
    setEndDate(null);
    setDataToShow(
      Object.keys(tankLevels).map((time) => {
        const level = tankLevels[time];
        const prevLevel =
          Object.keys(tankLevels).indexOf(time) > 0
            ? tankLevels[
                Object.keys(tankLevels)[
                  Object.keys(tankLevels).indexOf(time) - 1
                ]
              ]
            : null;
        const change =
          prevLevel !== null
            ? level < prevLevel
              ? "Sale"
              : level > prevLevel
              ? "Refill"
              : "No change"
            : "No change";

        return { time, level, change };
      })
    );
    setTotalSold(null);
    setTotalRefill(null);
    setRefillCount(null);
    setShowFiltered(false);
    setFilterType(null);
  };

  const exportTableToCSV = () => {
    // Filter data based on the current filter type
    const rows = dataToShow
      .filter((entry) =>
        showFiltered
          ? filterType === "Sale"
            ? entry.change === "Sale"
            : filterType === "Refill"
            ? entry.change === "Refill"
            : true
          : true
      )
      .map(({ time, level, change }) => [time, level, change]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      ["Time,Level,Change", ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTableToPDF = () => {
    const doc = new jsPDF();

    // Add title text
    doc.text("Monitoring Report", 14, 16);

    // Add table
    doc.autoTable({
      startY: 22, // Position the table below the title
      head: [["Time", "Level", "Change"]],
      body: dataToShow
        .filter((entry) =>
          showFiltered
            ? filterType === "Sale"
              ? entry.change === "Sale"
              : filterType === "Refill"
              ? entry.change === "Refill"
              : true
            : true
        )
        .map(({ time, level, change }) => [time, level, change]),
    });

    //Y position after the table
    const tableY = doc.lastAutoTable.finalY;

    //summary text based on filter type
    if (showFiltered) {
      if (filterType === "Sale") {
        doc.text(
          `Total LPG Sold: ${totalSold ? totalSold + " liters" : "N/A"}`,
          14,
          tableY + 10
        );
      } else if (filterType === "Refill") {
        doc.text(
          `Total LPG Refilled: ${
            totalRefill ? totalRefill + " liters" : "N/A"
          }`,
          14,
          tableY + 10
        );
        doc.text(
          `Number of Refills: ${refillCount !== null ? refillCount : "N/A"}`,
          14,
          tableY + 20
        );
      }
    }

    // Save the PDF
    doc.save("report.pdf");
  };

  const displayData = showFiltered
    ? dataToShow
    : Object.keys(tankLevels).map((time) => {
        const level = tankLevels[time];
        const prevLevel =
          Object.keys(tankLevels).indexOf(time) > 0
            ? tankLevels[
                Object.keys(tankLevels)[
                  Object.keys(tankLevels).indexOf(time) - 1
                ]
              ]
            : null;
        const change =
          prevLevel !== null
            ? level < prevLevel
              ? "Sale"
              : level > prevLevel
              ? "Refill"
              : "No change"
            : "No change";

        return { time, level, change };
      });

  return (
    <div className="container">
      <h1> Monitoring Report</h1>
      <div className="date-picker">
        <label>Start Time:</label>
        <DatePicker
          selected={startDate}
          onChange={(date) => setStartDate(date)}
          showTimeSelect
          dateFormat="MMMM d, yyyy h:mm aa"
        />
      </div>
      <div className="date-picker">
        <label>End Time:</label>
        <DatePicker
          selected={endDate}
          onChange={(date) => setEndDate(date)}
          showTimeSelect
          dateFormat="MMMM d, yyyy h:mm aa"
        />
      </div>
      <button onClick={() => handleCalculate("Sale")}>Filter Sales Only</button>
      <button onClick={() => handleCalculate("Refill")}>
        Filter Refills Only
      </button>
      <button onClick={handleReset}>Reset</button>

      <h2>Data</h2>
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Level</th>
            <th>Change</th>
          </tr>
        </thead>
        <tbody>
          {displayData
            .filter((entry) =>
              showFiltered
                ? filterType === "Sale"
                  ? entry.change === "Sale"
                  : entry.change === "Refill"
                : true
            )
            .map((entry, index) => (
              <tr key={index}>
                <td>{entry.time}</td>
                <td>{entry.level}</td>
                <td>{entry.change}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <button onClick={exportTableToCSV}>Download CSV</button>
      <button onClick={exportTableToPDF}>Download PDF</button>

      {showFiltered && filterType === "Sale" && totalSold !== null && (
        <div>
          <h2>Total LPG Sold: {totalSold} liters</h2>
        </div>
      )}
      {showFiltered && filterType === "Refill" && totalRefill !== null && (
        <div>
          <h2>Total LPG Refilled: {totalRefill} liters</h2>
          <h2>Number of Refills: {refillCount}</h2>
        </div>
      )}
    </div>
  );
};

export default LPGMonitor;
