# EMCI — Roles & Access Levels

This document defines every user role in the EMCI Student Intelligence Interface, the authentication method, the access level assigned to each role, what they can see and do within the platform, and the data they interact with.

---

## Overview

EMCI operates across a multi-stakeholder ecosystem. Access is split across three role groups, each with its own authentication method and data visibility rules:

| Tier | Role Group | Authentication |
|------|------------|----------------|
| **Tier 1 — Internal** | ACCE Users | Microsoft SSO (Azure AD) |
| **Tier 2 — School-Scoped** | School Administrators / Principals | Username + Password + MFA |
| **Tier 3 — External Oversight** | Department of Education / DE External Users | Username + Password + MFA |

> **Authentication summary:** Internal ACCE staff sign in via Microsoft SSO (single sign-on through Azure AD). All external users (School Administrators / Principals and Department of Education) authenticate with a username and password protected by mandatory multi-factor authentication (MFA). MFA enrolment is enforced on first login — external users cannot access the platform until MFA is configured.

---

## Role Definitions

### 1. ACCE Users
**Tier:** Internal  
**Authentication:** Microsoft SSO (Azure AD)  
**Access Level:** Full Read / Write — network-wide, no restrictions

ACCE Users are internal staff of the ACCE / EMCI organisation. This single role covers all internal staff who deliver, manage, oversee, or technically support the EMCI programme — including counsellors, programme managers, executives, and system administrators. ACCE Users have unrestricted access to the platform.

#### What They Can Do
- View the full Network Overview (all KPI cards, all school cards, all regional breakdowns)
- View, drill into, and manage every School Dashboard
- View any student's full journey, profile, and event history regardless of school or counsellor
- Log new counselling sessions, referrals, consent records, and survey events on any student timeline
- Progress students through stages (Referral & Consent → Career Guidance → Complete)
- Generate, preview, and export PDF journey reports for any student
- Access the full Counsellor View, including workload and performance data for all counsellors
- Assign and reassign counsellors to students or schools
- Onboard new schools and manage school status (Active / Onboarding / Inactive)
- Access the Dataverse Developer Lab for API testing, query building, and connection management
- Configure system settings, environment variables, and Azure AD app registrations
- Export programme-wide and executive summary reports
- View and manage all programme configuration and platform infrastructure

#### What They Cannot Do
- (No role-level restrictions — ACCE Users see everything)
- Bypass audit logging for production data access (audited at the platform layer, not blocked by role)

#### Data Scope
| Data | Access |
|------|--------|
| All schools | Read / Write |
| All students (including names, IDs, year levels, Morrisby IDs) | Read / Write |
| All counsellor data and performance | Read / Write |
| Network statistics and regional summaries | Full Access |
| PDF export | All students |
| Dataverse Developer Lab | Full Access |
| System configuration | Full Access |

---

### 2. School Administrators / Principals
**Tier:** School-Scoped  
**Authentication:** Username + Password + MFA  
**Access Level:** Read Only — scoped strictly to their own school

School Administrators and Principals are responsible for their school's participation in the EMCI programme. They monitor enrolment and progress at a school level. Their access is **restricted to their own school's students only** — they cannot see any data belonging to another school.

#### What They Can Do
- Sign in with username + password protected by mandatory MFA (MFA enrolment is required and enforced on first login — access is blocked until MFA is configured)
- View the full School Dashboard for **their own school only**
- View all students enrolled in EMCI at their school, including student names, year levels, and stage progress
- View programme completion rates and stage breakdowns for their school
- Filter and search the student list within their school
- View counsellor assignment information (which counsellor is assigned to which student at their school)
- View the activity feed and event history for students at their school
- Receive programme summary exports for their school

#### What They Cannot Do
- View or access any other school's data, students, or dashboard
- View students that do not belong to their school
- Edit student journey data, log counselling events, or progress students through stages
- Generate or export PDF student reports
- Access the Network Overview, Counsellor View, or Dataverse Developer Lab
- Modify system or programme configuration
- Manage counsellor assignments

#### Data Scope
| Data | Access |
|------|--------|
| Own school's student list (names visible) | Read Only |
| Own school's stage progress and completion stats | Read Only |
| Own school's counsellor assignments | Read Only |
| Own school's activity feed | Read Only |
| Other schools (any data) | No Access |
| Network-wide data | No Access |
| PDF export | No Access |
| Dataverse / system data | No Access |

---

### 3. Department of Education / DE External Users
**Tier:** External Oversight  
**Authentication:** Username + Password + MFA  
**Access Level:** Aggregated Read Only — student names and identifiers are never visible

Department of Education (DE) External Users are government stakeholders who monitor the EMCI programme at a policy and outcomes level. They authenticate as external users and see only aggregated, de-identified data. **DE users must never see student names, student IDs, or any other individual student identifier anywhere in the platform.**

#### What They Can Do
- Sign in with username + password protected by mandatory MFA (MFA enrolment is required and enforced on first login — access is blocked until MFA is configured)
- View aggregated Network Overview statistics (total students enrolled, completion rates, schools active, programme coverage)
- View per-school programme completion percentages and stage distributions
- Filter the network by region
- View high-level counsellor coverage (count of active counsellors, not individual records)
- Access summary programme health reports
- Export anonymised, aggregated network-level data

#### What They Cannot Do
- **View any student's name, Morrisby ID, year level, email, or other personal identifier — anywhere in the platform**
- View any individual student record, profile, journey, or event history
- Open the School Dashboard student table or any list that surfaces student names
- Open the Student Journey view for any student
- View individual counsellor performance or workload detail
- Access the Dataverse Developer Lab
- Modify any data in the system

#### Data Scope
| Data | Access |
|------|--------|
| Network KPI totals | Read Only (aggregated) |
| Per-school completion stats | Read Only (aggregated) |
| Regional breakdowns | Read Only (aggregated) |
| Individual student records (names, IDs, year levels, Morrisby IDs) | **No Access** |
| Counsellor performance detail | No Access |
| Dataverse / system data | No Access |
| PDF export | No Access |

---

## Access Matrix Summary

The table below summarises which pages and features are accessible per role.

| Feature / View | ACCE Users | School Admin / Principal | DE External Users |
|---|:---:|:---:|:---:|
| Network Overview (KPI cards) | ✅ | — | ✅ (agg.) |
| Network Overview (school cards) | ✅ | — | ✅ (agg.) |
| School Dashboard (own school) | ✅ | ✅ (read) | — |
| School Dashboard (other schools) | ✅ | — | — |
| Student Journey (any student) | ✅ | — | — |
| Student names / IDs visible | ✅ | ✅ (own school) | — |
| Log / Edit Timeline Events | ✅ | — | — |
| Progress Student Stage | ✅ | — | — |
| PDF Export (any student) | ✅ | — | — |
| Counsellor View (all counsellors) | ✅ | — | — |
| School onboarding / management | ✅ | — | — |
| Dataverse Developer Lab | ✅ | — | — |
| System configuration | ✅ | — | — |
| Aggregated programme reports | ✅ | ✅ (own school) | ✅ (anonymised) |

> **Legend:** ✅ = Accessible, — = No Access, (agg.) = Aggregated data only, (read) = Read only, (own school) = Own school only, (anonymised) = No personal identifiers

---

## Role Assignment

Roles are managed through **Azure Active Directory (Azure AD)** security groups. ACCE Users authenticate via Microsoft SSO (single sign-on through Azure AD) and their role is derived from their AAD group membership. School Administrators / Principals and DE External Users authenticate with a username + password protected by mandatory multi-factor authentication (MFA), and are assigned to the corresponding external-user AAD group.

| Role | AAD Group (suggested) | Authentication Method |
|------|-----------------------|-----------------------|
| ACCE Users | `EMCI-ACCEUsers` | Microsoft SSO (Azure AD) |
| School Administrators / Principals | `EMCI-SchoolAdmins` | Username + Password + MFA |
| Department of Education / DE External Users | `EMCI-DoE` | Username + Password + MFA |

---

## Data Privacy & Compliance Considerations

- **Student PII** (names, Morrisby IDs, emails, year levels) is restricted to **ACCE Users** (full access) and **School Administrators / Principals** (own school only). DE External Users must never see any of these fields anywhere in the platform.
- **DE External Users** receive only aggregated, non-identifiable statistics. The user interface must hide all student identifiers from this role at the data and presentation layers.
- **MFA** is mandatory for all username + password sign-ins (School Administrators / Principals and DE External Users). MFA enrolment is enforced on first login — the platform must block access until the user has completed MFA setup. MFA cannot be bypassed or deferred. MFA session tokens expire in less than 24 hours — users must re-authenticate with MFA on each new session.
- **ACCE Users** authenticate exclusively via Microsoft SSO; password-based sign-in is not available to this role.
- All data access is mediated through the Dataverse API layer. No direct database access is permitted for any user-facing role.
- The EMCI platform stores no student data locally — all student records reside in the connected **Microsoft Dataverse** environment (`mcicrm.crm6.dynamics.com`).
- Access logs are maintained by Azure AD and Dataverse audit trails.
- In scope for the **Australian Privacy Act 1988** and relevant state-level education data governance frameworks.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for a full history of platform changes.
