
import type { ActionResult } from "@/lib/action";
import { apiAction, apiFile } from "@/lib/api";

export interface ProfileInput {
  fatherName: string; dateOfBirth: string; currentAddress: string; permanentAddress: string; emergencyName: string; emergencyRelation: string;
  emergencyPhoneCountry: string; emergencyPhone: string;
}

export async function uploadProfilePhoto(photo: Blob): Promise<ActionResult> {
  return apiFile("PUT", "/api/v1/profile/photo", photo);
}

export async function removeProfilePhoto(): Promise<ActionResult> {
  return apiFile("DELETE", "/api/v1/profile/photo");
}

/** Saves the details people edit themselves (everything else is changed by HR). */
export async function saveMyProfile(i: ProfileInput): Promise<ActionResult> {
  return apiAction("PUT", "/api/v1/profile", i, ["/profile"]);
}
