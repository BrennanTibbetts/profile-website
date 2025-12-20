import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Custom hook to manage 3D carousel rotation animation
 * Handles smooth interpolation between slides and drag offset
 * 
 * @param {number} slideIndex - Current slide index
 * @param {Object} dragOffsetRef - Reference to current drag offset
 * @param {number} numItems - Total number of carousel items
 * @param {number} radius - Carousel radius (default: 3.5)
 * @returns {Object} Group ref, position/rotation helpers
 */
export function useCarouselRotation(slideIndex, dragOffsetRef, numItems, radius = 3.5) {
  const groupRef = useRef();
  const isInitialized = useRef(false);

  /**
   * Calculate 3D position for an item at given index
   * @param {number} index - Item index
   * @param {number} yOffset - Vertical offset (default: 0)
   * @returns {Array} [x, y, z] position
   */
  const getPosition = (index, yOffset = 0) => {
    const angle = index * ((2 * Math.PI) / numItems);
    return [radius * Math.sin(angle), yOffset, radius * Math.cos(angle)];
  };

  /**
   * Calculate rotation for an item at given index
   * @param {number} index - Item index
   * @returns {Array} [x, y, z] rotation in radians
   */
  const getRotation = (index) => {
    const angle = index * ((2 * Math.PI) / numItems);
    return [0, angle, 0];
  };

  // Animation frame handler for smooth rotation
  useFrame((state, delta) => {
    const targetRotation = -slideIndex * ((2 * Math.PI) / numItems);
    const currentTarget = targetRotation + (dragOffsetRef?.current || 0);

    if (groupRef.current) {
      if (!isInitialized.current) {
        // Initialize immediately to avoid flash
        groupRef.current.rotation.y = currentTarget;
        isInitialized.current = true;
      } else {
        // Smooth interpolation for rotation changes
        groupRef.current.rotation.y = THREE.MathUtils.lerp(
          groupRef.current.rotation.y,
          currentTarget,
          delta * 5
        );
      }
    }
  });

  return {
    groupRef,
    getPosition,
    getRotation,
  };
}
