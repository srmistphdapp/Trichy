// JavaScript script to update user passwords using Supabase Admin API for PhD Trichy System
// Run this in Node.js environment or browser console

import { createClient } from '@supabase/supabase-js'

// PhD Trichy Supabase Configuration
const supabaseUrl = 'https://vqnzovyhnuabjltgpjvy.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZxbnpvdnlobnVhYmpsdGdwanZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjIyNDg3NywiZXhwIjoyMDgxODAwODc3fQ.wT1Fydt8DO61x6XSGy-jOxfpO6PjNc9tAWiUjwSXT2w'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function updateUserPassword(email, newPassword) {
  try {
    // First, get the user by email
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing users:', listError)
      return
    }
    
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.log(`User not found: ${email}`)
      return
    }
    
    // Update the user's password
    const { data, error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )
    
    if (error) {
      console.error(`Error updating password for ${email}:`, error)
    } else {
      console.log(`✅ Password updated successfully for ${email}`)
    }
  } catch (err) {
    console.error(`Exception updating password for ${email}:`, err)
  }
}

async function updateAllPasswordsTrichy() {
  console.log('🔄 Starting password updates for PhD Trichy system...')
  
  // Update specific users
  await updateUserPassword('director@srmtrp.edu.in', '1234')
  await updateUserPassword('researchco@gmail.com', '1234')
  
  // Update faculty-specific emails if they exist
  const facultyEmails = [
    'et@gmail.com',      // Engineering & Technology
    'ms@gmail.com',      // Medical Sciences  
    'hum@gmail.com',     // Humanities
    'mnmt@gmail.com'     // Management
  ]
  
  for (const email of facultyEmails) {
    await updateUserPassword(email, '1234')
  }
  
  // Get all admin users and update their passwords
  try {
    const { data: admins, error: adminError } = await supabase
      .from('admins')
      .select('email')
      .not('email', 'is', null)
    
    if (adminError) {
      console.error('Error fetching admins:', adminError)
    } else {
      console.log(`Found ${admins.length} admin users`)
      for (const admin of admins) {
        await updateUserPassword(admin.email, '1234')
      }
    }
  } catch (err) {
    console.error('Exception updating admin passwords:', err)
  }
  
  // Get all department users and update their passwords
  try {
    const { data: deptUsers, error: deptError } = await supabase
      .from('department_users')
      .select('email')
      .not('email', 'is', null)
    
    if (deptError) {
      console.error('Error fetching department users:', deptError)
    } else {
      console.log(`Found ${deptUsers.length} department users`)
      for (const deptUser of deptUsers) {
        await updateUserPassword(deptUser.email, '1234')
      }
    }
  } catch (err) {
    console.error('Exception updating department user passwords:', err)
  }
  
  // Get all coordinators and update their passwords
  try {
    const { data: coordinators, error: coordError } = await supabase
      .from('coordinators')
      .select('email')
      .not('email', 'is', null)
    
    if (coordError) {
      console.error('Error fetching coordinators:', coordError)
    } else {
      console.log(`Found ${coordinators.length} coordinators`)
      for (const coordinator of coordinators) {
        await updateUserPassword(coordinator.email, '1234')
      }
    }
  } catch (err) {
    console.error('Exception updating coordinator passwords:', err)
  }
  
  console.log('✅ Password update process completed for PhD Trichy system!')
}

// Run the update
updateAllPasswordsTrichy()

// Export for use in other files
export { updateUserPassword, updateAllPasswordsTrichy }