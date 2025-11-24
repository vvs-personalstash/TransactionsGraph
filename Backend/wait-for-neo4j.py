#!/usr/bin/env python3
"""
Wait for Neo4j to be ready before starting the application
"""
import os
import time
import sys
from neo4j import GraphDatabase

def wait_for_neo4j(uri, username, password, max_attempts=30, delay=2):
    """
    Wait for Neo4j to be ready
    
    Args:
        uri: Neo4j connection URI
        username: Neo4j username
        password: Neo4j password
        max_attempts: Maximum number of connection attempts
        delay: Delay in seconds between attempts
    """
    print(f"Waiting for Neo4j at {uri}...")
    
    for attempt in range(1, max_attempts + 1):
        try:
            driver = GraphDatabase.driver(uri, auth=(username, password))
            driver.verify_connectivity()
            driver.close()
            print(f"Neo4j is ready! (attempt {attempt}/{max_attempts})")
            return True
        except Exception as e:
            print(f"Attempt {attempt}/{max_attempts}: Neo4j not ready yet - {e}")
            if attempt < max_attempts:
                time.sleep(delay)
    
    print(f"Failed to connect to Neo4j after {max_attempts} attempts")
    return False


if __name__ == "__main__":
    # Get Neo4j connection details from environment
    neo4j_uri = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
    neo4j_user = os.getenv("NEO4J_USER", "neo4j")
    neo4j_pass = os.getenv("NEO4J_PASS", "password")
    
    # Wait for Neo4j
    if wait_for_neo4j(neo4j_uri, neo4j_user, neo4j_pass):
        # Start the Flask application
        print("Starting Flask application...")
        os.system("python app.py")
    else:
        print("Could not connect to Neo4j. Exiting.")
        sys.exit(1)

