# Wireframes

## Mobile Dashboard

```text
┌─────────────────────────────┐
│ Family Education            │
│ This Week        [+ Event]  │
├─────────────────────────────┤
│ Weekly Focus                │
│ Math + reading + exam prep  │
├─────────────────────────────┤
│ Metric cards                │
│ Events | Study | Goals      │
├─────────────────────────────┤
│ Children horizontal cards   │
│ Emma | Noah | Mia | + Add   │
├─────────────────────────────┤
│ Upcoming                    │
│ 09:00 School assembly       │
│ 16:30 Math tutoring         │
├─────────────────────────────┤
│ Tabs                        │
│ Calendar Growth Roadmap     │
│ Resources Profiles          │
└─────────────────────────────┘
```

## Desktop Dashboard

```text
┌────────────────────────────────────────────────────────────┐
│ Sidebar       │ Header: Family Education Dashboard          │
│ Dashboard     │ Search / Week / Add                         │
│ Children      ├──────────────────────────────────────────────┤
│ Calendar      │ Metrics row                                  │
│ Growth        ├──────────────────────┬───────────────────────┤
│ Roadmap       │ Weekly Overview      │ Upcoming Events       │
│ Resources     │                      │                       │
│ Settings      ├──────────────────────┴───────────────────────┤
│               │ Children + selected child profile             │
│               ├──────────────────────┬───────────────────────┤
│               │ Calendar             │ Growth Summary        │
│               ├──────────────────────┴───────────────────────┤
│               │ Roadmap + Resource Center                     │
└────────────────────────────────────────────────────────────┘
```

## Child Profile

```text
┌───────────────────────────────────────┐
│ Child header: avatar, name, grade     │
│ School: name, program, advisor notes  │
├───────────────────────────────────────┤
│ Today / Week responsibilities         │
├───────────────────────────────────────┤
│ Subject performance                   │
├───────────────────────────────────────┤
│ Goals and milestones                  │
└───────────────────────────────────────┘
```

## Information Architecture

```mermaid
flowchart LR
  Dashboard --> Children
  Dashboard --> Calendar
  Dashboard --> Growth
  Dashboard --> Roadmap
  Dashboard --> Resources
  Children --> Profile
  Profile --> School
  Profile --> Records
  Profile --> Goals
  Calendar --> Events
  Growth --> Reports
  Resources --> Files
  Resources --> Notes
```
