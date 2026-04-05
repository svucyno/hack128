from __future__ import annotations

from app.inference.catalog import get_role_skill_map
from app.preprocessing.normalize_skills import normalize_skill_name
from app.schemas.roles import RolePredictResponse, RolePredictionItem


def predict_role_payload(skills: list[str], education: str, interests: list[str]) -> RolePredictResponse:
    normalized_skills = {normalize_skill_name(skill) for skill in skills if str(skill).strip()}
    normalized_education = str(education or "").lower()
    normalized_interests = [str(item or "").lower() for item in interests]
    role_skill_map = get_role_skill_map()

    scored_roles = []
    for role, metadata in role_skill_map.items():
      required_skills = set(metadata.get("skills", []))
      matched_skills = normalized_skills & required_skills
      skill_score = (len(matched_skills) / len(required_skills)) if required_skills else 0.0
      interest_score = 0.0
      if metadata.get("interest_keywords"):
          interest_matches = sum(
              1
              for keyword in metadata["interest_keywords"]
              if any(keyword in interest for interest in normalized_interests)
          )
          interest_score = min(0.25, interest_matches * 0.08)
      education_score = 0.08 if any(keyword in normalized_education for keyword in metadata.get("education_keywords", [])) else 0.0
      total_score = min(1.0, skill_score * 0.72 + interest_score + education_score)
      scored_roles.append(
          {
              "role": role,
              "score": total_score,
              "matched_skills": sorted(matched_skills),
          }
      )

    scored_roles.sort(key=lambda item: item["score"], reverse=True)
    top_predictions = [
        RolePredictionItem(role=item["role"], score=round(item["score"], 2))
        for item in scored_roles[:3]
    ]

    explanation = []
    if scored_roles:
        top_role = scored_roles[0]
        if top_role["matched_skills"]:
            explanation.append(
                f"Strong overlap with {top_role['role']} skills: {', '.join(top_role['matched_skills'][:4])}."
            )
        if interests:
            explanation.append("User interests align with the predicted role category.")
        if education:
            explanation.append("Education signal supports the predicted path.")
    else:
        explanation.append("No role signals found in the current input.")

    return RolePredictResponse(
        predictions=top_predictions,
        top_role=top_predictions[0].role if top_predictions else "",
        explanation=explanation[:3],
    )
