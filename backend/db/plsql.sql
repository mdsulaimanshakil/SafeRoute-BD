-- ============================================================
--  SafeRoute BD — PL/SQL Components
--  Views, Functions, Procedures, Triggers, and Advanced Queries
-- ============================================================

-- ────────────────────────────────────────────
--  1. VIEW: zone_incident_summary
-- ────────────────────────────────────────────
CREATE OR REPLACE VIEW zone_incident_summary AS
SELECT z.zone_id, z.area_name, z.safety_score, z.is_high_risk,
       COUNT(r.report_id) AS total_incidents,
       SUM(CASE WHEN r.status='RESOLVED' THEN 1 ELSE 0 END) AS resolved,
       SUM(CASE WHEN r.status='PENDING' THEN 1 ELSE 0 END) AS pending
FROM LOCATION_ZONES z 
LEFT JOIN INCIDENT_REPORTS r ON z.zone_id = r.zone_id
GROUP BY z.zone_id, z.area_name, z.safety_score, z.is_high_risk;
/

-- ────────────────────────────────────────────
--  2. FUNCTION: get_safety_grade
-- ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_safety_grade(p_zone_id NUMBER) 
RETURN VARCHAR2 
IS
  v_score NUMBER;
  v_grade VARCHAR2(1);
BEGIN
  SELECT safety_score INTO v_score FROM LOCATION_ZONES WHERE zone_id = p_zone_id;
  
  IF v_score >= 80 THEN
    v_grade := 'A';
  ELSIF v_score >= 60 THEN
    v_grade := 'B';
  ELSIF v_score >= 40 THEN
    v_grade := 'C';
  ELSE
    v_grade := 'D';
  END IF;
  
  RETURN v_grade;
EXCEPTION
  WHEN NO_DATA_FOUND THEN
    RETURN NULL;
END;
/

-- ────────────────────────────────────────────
--  3. PROCEDURE: recalculate_all_safety_scores
-- ────────────────────────────────────────────
CREATE OR REPLACE PROCEDURE recalculate_all_safety_scores 
IS
  v_incident_count NUMBER;
  v_new_score NUMBER;
  v_high_risk NUMBER(1);
  
  CURSOR c_zones IS SELECT zone_id FROM LOCATION_ZONES;
BEGIN
  FOR z_rec IN c_zones LOOP
    SELECT COUNT(*) INTO v_incident_count FROM INCIDENT_REPORTS WHERE zone_id = z_rec.zone_id;
    
    v_new_score := GREATEST(0, 100 - (v_incident_count * 10));
    IF v_new_score < 40 THEN
      v_high_risk := 1;
    ELSE
      v_high_risk := 0;
    END IF;
    
    UPDATE LOCATION_ZONES 
       SET safety_score = v_new_score, is_high_risk = v_high_risk
     WHERE zone_id = z_rec.zone_id;
  END LOOP;
  COMMIT;
END;
/

-- ────────────────────────────────────────────
--  4. TRIGGER: trg_update_safety_after_incident
--     Uses a compound trigger so the recalculation
--     runs after the insert statement completes.
-- ────────────────────────────────────────────
CREATE OR REPLACE TRIGGER trg_update_safety_after_incident
  FOR INSERT ON INCIDENT_REPORTS
COMPOUND TRIGGER
  TYPE zone_id_tab IS TABLE OF INCIDENT_REPORTS.zone_id%TYPE INDEX BY PLS_INTEGER;
  g_zone_ids zone_id_tab;
  g_count    PLS_INTEGER := 0;

  AFTER EACH ROW IS
  BEGIN
    g_count := g_count + 1;
    g_zone_ids(g_count) := :NEW.zone_id;
  END AFTER EACH ROW;

  AFTER STATEMENT IS
    v_incident_count NUMBER;
    v_new_score      NUMBER;
    v_high_risk      NUMBER(1);
  BEGIN
    FOR i IN 1 .. g_count LOOP
      SELECT COUNT(*) INTO v_incident_count
        FROM INCIDENT_REPORTS
       WHERE zone_id = g_zone_ids(i);

      v_new_score := GREATEST(0, 100 - (v_incident_count * 10));
      IF v_new_score < 40 THEN
        v_high_risk := 1;
      ELSE
        v_high_risk := 0;
      END IF;

      UPDATE LOCATION_ZONES
         SET safety_score = v_new_score,
             is_high_risk = v_high_risk
       WHERE zone_id = g_zone_ids(i);
    END LOOP;
  END AFTER STATEMENT;
END trg_update_safety_after_incident;
/


-- ============================================================
--  5. FIVE ADVANCED DEMO QUERIES
-- ============================================================

-- Q1: 3-table JOIN: Users + Incidents + Zones
-- Description: Retrieves detailed report logs with user names and zone areas
/*
SELECT u.full_name, ir.category, lz.area_name, ir.created_at
  FROM INCIDENT_REPORTS ir
  JOIN USERS u ON ir.user_id = u.user_id
  JOIN LOCATION_ZONES lz ON ir.zone_id = lz.zone_id
 WHERE ir.is_anon = 0;
*/

-- Q2: Subquery: zones with above average incident count
-- Description: Finds zones that have more incidents than the overall average across all zones
/*
SELECT zone_id, area_name 
  FROM LOCATION_ZONES
 WHERE zone_id IN (
    SELECT zone_id 
      FROM INCIDENT_REPORTS 
     GROUP BY zone_id 
    HAVING COUNT(*) > (
       SELECT COUNT(*) / COUNT(DISTINCT zone_id) FROM INCIDENT_REPORTS
    )
 );
*/

-- Q3: GROUP BY HAVING: categories with more than 2 incidents
-- Description: Groups reports by category and filters for those with >2 occurrences
/*
SELECT category, COUNT(*) as incident_count
  FROM INCIDENT_REPORTS
 GROUP BY category
HAVING COUNT(*) > 2;
*/

-- Q4: RANK() window function: zones ranked by safety score
-- Description: Ranks all zones from safest to most dangerous using analytic function
/*
SELECT area_name, safety_score, 
       RANK() OVER (ORDER BY safety_score DESC) as safety_rank
  FROM LOCATION_ZONES;
*/

-- Q5: Correlated subquery: users who reported more than 1 incident
-- Description: Finds all users who have actively contributed more than 1 report
/*
SELECT full_name 
  FROM USERS u
 WHERE 1 < (
    SELECT COUNT(*) 
      FROM INCIDENT_REPORTS ir 
     WHERE ir.user_id = u.user_id
 );
*/

EXIT;
