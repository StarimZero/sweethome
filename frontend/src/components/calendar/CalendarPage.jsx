import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../api';
import './Calendar.scss';

const CalendarPage = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  // 공휴일 조회
  const fetchHolidays = async () => {
    try {
      const res = await apiClient.get(`/calendar/holidays/${currentYear}`);
      setHolidays(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await apiClient.get('/calendar', {
        params: { year: currentYear, month: currentMonth }
      });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchEvents();
    setSelectedDate(null);
  }, [currentYear, currentMonth]);

  // 연도 변경 시 공휴일 새로 조회
  useEffect(() => {
    fetchHolidays();
  }, [currentYear]);

  // 공휴일 맵 (날짜 -> 공휴일명)
  const holidayMap = useMemo(() => {
    const map = {};
    holidays.forEach(h => {
      const key = h.date; // YYYY-MM-DD
      if (!map[key]) map[key] = [];
      map[key].push(h.name);
    });
    return map;
  }, [holidays]);

  // 달력 정보 계산
  const calendarInfo = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();
    const totalCells = Math.ceil((startDayOfWeek + daysInMonth) / 7) * 7;

    const days = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true });
    }
    while (days.length < totalCells) {
      days.push({ day: null, isCurrentMonth: false });
    }

    return { days, daysInMonth, startDayOfWeek, totalRows: totalCells / 7 };
  }, [currentYear, currentMonth]);

  // 단일 이벤트 (기간 아닌 것)
  const singleEvents = useMemo(() => {
    return events.filter(ev => !ev.is_range);
  }, [events]);

  // 기간 이벤트
  const rangeEvents = useMemo(() => {
    return events.filter(ev => ev.is_range);
  }, [events]);

  // 날짜별 단일 이벤트 그룹화
  const eventsByDate = useMemo(() => {
    return singleEvents.reduce((acc, event) => {
      const displayDate = event.is_lunar && event.solar_date ? event.solar_date : event.date;
      const day = displayDate.slice(8, 10);
      if (!acc[day]) acc[day] = [];
      acc[day].push(event);
      return acc;
    }, {});
  }, [singleEvents]);

  // 기간 이벤트 표시 정보 계산
  const rangeEventDisplays = useMemo(() => {
    const { daysInMonth } = calendarInfo;
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${daysInMonth}`;

    return rangeEvents.map(event => {
      const startDate = event.date;
      const endDate = event.end_date;
      const isOpenEnd = !endDate;

      // 이 달에 표시할 시작/끝 날짜
      const displayStart = startDate > monthStart ? parseInt(startDate.slice(8, 10)) : 1;
      const displayEnd = !endDate ? daysInMonth :
        (endDate < monthEnd ? parseInt(endDate.slice(8, 10)) : daysInMonth);

      return {
        ...event,
        displayStart,
        displayEnd,
        isOpenEnd,
        displayRange: `${startDate.slice(5)} ~ ${endDate ? endDate.slice(5) : '미정'}`
      };
    });
  }, [rangeEvents, calendarInfo, currentYear, currentMonth]);

  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear(currentYear - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear(currentYear + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDateClick = (day) => {
    if (!day) return;
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
  };

  const handleAddEvent = () => {
    if (selectedDate) {
      navigate(`/calendar/new?date=${selectedDate}`);
    } else {
      navigate('/calendar/new');
    }
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() + 1 &&
      currentYear === today.getFullYear()
    );
  };

  // 선택된 날짜의 이벤트들
  const getEventsForDate = (dateStr) => {
    const day = parseInt(dateStr.slice(8, 10));
    const dayStr = String(day).padStart(2, '0');
    const singleEvs = eventsByDate[dayStr] || [];

    const rangeEvs = rangeEventDisplays.filter(ev =>
      day >= ev.displayStart && day <= ev.displayEnd
    );

    return [...singleEvs, ...rangeEvs];
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div className="calendar-page">
      <h1>Calendar</h1>
      <p className="subtitle">기념일과 메모를 기록하세요</p>

      {/* 월 네비게이션 */}
      <div className="month-nav">
        <button className="nav-btn" onClick={handlePrevMonth}>&lt;</button>
        <span className="month-label">{currentYear}년 {currentMonth}월</span>
        <button className="nav-btn" onClick={handleNextMonth}>&gt;</button>
      </div>

      {/* 기간 이벤트 바 (달력 상단) */}
      {rangeEventDisplays.length > 0 && (
        <div className="range-events-section">
          <div className="range-events-header">
            <span className="range-label">기간 이벤트</span>
          </div>
          <div className="range-events-bars">
            {rangeEventDisplays.map((event, idx) => {
              const { daysInMonth } = calendarInfo;
              const startPercent = ((event.displayStart - 1) / daysInMonth) * 100;
              const widthPercent = ((event.displayEnd - event.displayStart + 1) / daysInMonth) * 100;

              return (
                <div key={event.id || idx} className="range-bar-row">
                  <div
                    className={`range-bar ${event.isOpenEnd ? 'open-end' : ''}`}
                    style={{
                      backgroundColor: event.color || '#6c5ce7',
                      left: `${startPercent}%`,
                      width: `${widthPercent}%`
                    }}
                    onClick={() => navigate(`/calendar/${event.id}`)}
                  >
                    <span className="bar-title">{event.title}</span>
                    <span className="bar-date">{event.displayRange}</span>
                    {event.isOpenEnd && <span className="open-arrow">→</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* 날짜 눈금 */}
          <div className="range-dates-ruler">
            {[1, 5, 10, 15, 20, 25, calendarInfo.daysInMonth].map(d => (
              <span key={d} className="ruler-date" style={{ left: `${((d - 1) / calendarInfo.daysInMonth) * 100}%` }}>
                {d}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 달력 그리드 */}
          <div className="calendar-grid">
            {/* 요일 헤더 */}
            <div className="weekday-header">
              {['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div key={day} className={`weekday ${idx === 0 ? 'sunday' : ''} ${idx === 6 ? 'saturday' : ''}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* 날짜 셀 */}
            <div className="calendar-body">
              {calendarInfo.days.map((item, idx) => {
                const dayStr = item.day ? String(item.day).padStart(2, '0') : null;
                const dateStr = dayStr ? `${currentYear}-${String(currentMonth).padStart(2, '0')}-${dayStr}` : null;
                const dayEvents = dayStr ? eventsByDate[dayStr] || [] : [];
                const isSunday = idx % 7 === 0;
                const isSaturday = idx % 7 === 6;

                // 해당 날짜의 공휴일
                const dayHolidays = dateStr ? holidayMap[dateStr] || [] : [];
                const isHoliday = dayHolidays.length > 0;

                // 해당 날짜에 기간 이벤트가 있는지
                const rangeEventsForDay = item.day ? rangeEventDisplays.filter(ev =>
                  item.day >= ev.displayStart && item.day <= ev.displayEnd
                ) : [];

                return (
                  <div
                    key={idx}
                    className={`day-cell ${!item.isCurrentMonth ? 'disabled' : ''} ${isToday(item.day) ? 'today' : ''} ${selectedDate === dateStr ? 'selected' : ''} ${isHoliday ? 'holiday' : ''}`}
                    onClick={() => handleDateClick(item.day)}
                  >
                    <span className={`day-number ${isSunday || isHoliday ? 'sunday' : ''} ${isSaturday ? 'saturday' : ''}`}>
                      {item.day}
                    </span>
                    {/* 공휴일 표시 */}
                    {dayHolidays.length > 0 && (
                      <div className="holiday-name">{dayHolidays[0]}</div>
                    )}

                    {/* 기간 이벤트 마커 */}
                    {rangeEventsForDay.length > 0 && (
                      <div className="range-markers">
                        {rangeEventsForDay.map((ev, i) => (
                          <div
                            key={ev.id || i}
                            className="range-marker"
                            style={{ backgroundColor: ev.color || '#6c5ce7' }}
                            title={ev.title}
                          />
                        ))}
                      </div>
                    )}

                    {/* 단일 이벤트 */}
                    {dayEvents.length > 0 && (
                      <div className="day-events">
                        {dayEvents.slice(0, 2).map((ev) => (
                          <div
                            key={ev.id}
                            className="event-item"
                            style={{ backgroundColor: ev.color || '#6c5ce7' }}
                          >
                            {ev.is_yearly && <span className="badge-icon">🔄</span>}
                            {ev.is_lunar && <span className="badge-icon">🌙</span>}
                            <span className="event-title">{ev.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="more-events">+{dayEvents.length - 2}</div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

      {/* 선택된 날짜 이벤트 */}
      {selectedDate && (
        <div className="selected-date-panel">
          <div className="panel-header">
            <h3>{selectedDate}</h3>
            <button className="add-btn" onClick={handleAddEvent}>+ 추가</button>
          </div>
          {selectedEvents.length > 0 ? (
            <ul className="event-list">
              {selectedEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="event-list-item"
                  onClick={() => navigate(`/calendar/${ev.id}`)}
                >
                  <span
                    className="color-dot"
                    style={{ backgroundColor: ev.color || '#6c5ce7' }}
                  />
                  <span className="event-title">
                    {ev.is_yearly && '🔄 '}
                    {ev.is_lunar && '🌙 '}
                    {ev.is_range && '📅 '}
                    {ev.title}
                  </span>
                  {ev.is_range && (
                    <span className="event-range">
                      {ev.displayRange || `${ev.date.slice(5)} ~ ${ev.end_date ? ev.end_date.slice(5) : '미정'}`}
                    </span>
                  )}
                  {ev.memo && <span className="event-memo">{ev.memo.slice(0, 30)}...</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-events">이벤트가 없습니다.</p>
          )}
        </div>
      )}

      {/* 새 이벤트 추가 버튼 */}
      {!selectedDate && (
        <div className="toolbar">
          <button className="add-btn" onClick={handleAddEvent}>+ 새 이벤트</button>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
