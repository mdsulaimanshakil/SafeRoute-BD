-- ============================================================
--  SafeRoute BD — Bangladesh Zone Seed Data
--  Adds major Bangladesh locations to LOCATION_ZONES
--  Safe to re-run: checks before insert
-- ============================================================

-- Check how many zones exist; if only the 3 defaults, add more
DECLARE
  v_count NUMBER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM LOCATION_ZONES;
  -- Only insert if we have 5 or fewer zones (the 3 originals + maybe a couple extra)
  IF v_count <= 5 THEN
    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Dhanmondi, Dhaka', 23.7465, 90.3760, 72.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Uttara, Dhaka', 23.8759, 90.3795, 80.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Banani, Dhaka', 23.7937, 90.4066, 75.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Mohammadpur, Dhaka', 23.7662, 90.3588, 55.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Farmgate, Dhaka', 23.7576, 90.3877, 60.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Tejgaon, Dhaka', 23.7618, 90.3960, 58.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Jatrabari, Dhaka', 23.7106, 90.4350, 35.0, 1);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Sadarghat, Dhaka', 23.7081, 90.4069, 30.0, 1);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Kamalapur, Dhaka', 23.7335, 90.4260, 50.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Rampura, Dhaka', 23.7635, 90.4230, 65.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Bashundhara, Dhaka', 23.8130, 90.4270, 85.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Khulna City Center', 22.8456, 89.5403, 55.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Chittagong GEC Circle', 22.3569, 91.8317, 60.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Sylhet Zindabazar', 24.8949, 91.8687, 65.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Rajshahi Court Area', 24.3745, 88.5865, 70.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('KUET Campus, Khulna', 22.9005, 89.5025, 90.0, 0);

    INSERT INTO LOCATION_ZONES (area_name, latitude, longitude, safety_score, is_high_risk)
    VALUES ('Cox Bazar Beach Area', 21.4272, 92.0058, 50.0, 0);

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Inserted 17 new Bangladesh zones.');
  ELSE
    DBMS_OUTPUT.PUT_LINE('Zones already populated (' || v_count || ' zones found). Skipping.');
  END IF;
END;
/

SELECT zone_id, area_name, safety_score, is_high_risk FROM LOCATION_ZONES ORDER BY area_name;

EXIT;
