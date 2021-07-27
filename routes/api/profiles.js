const express = require('express');
const Profile = require('../../models/Profile');
const Post = require("../../models/Post")
const router = express.Router();
const auth = require("../../middlewares/auth")
const {check, validationResult, body} = require('express-validator')
const User = require("../../models/User")
const request = require('request')
const config = require('config')


router.get("/me", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({user: req.user.id}).populate('user', ['name', 'avatar']);
        if(!profile){
            return res.status(400).json({msg: "There is no profile for this user"})
        }
        res.send(profile)
    } catch(err){
        console.error(err.message)
        res.status(500).send("Server Error")
    }
});

// creATE OR UPDATE USER PROFILE

router.post('/', [ auth, [
    check('status', 'status is required').not().isEmpty(),
    check('skills', 'skills are required').not().isEmpty()
]], async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()})
    }
    const {
        company,
        website,
        location, 
        bio,
        status,
        githubusername,
        skills,
        facebook,
        twitter,
        instagram,
        linkedin
    } = req.body;

    const profileFields = {}
    profileFields.user = req.user.id;
    if(company) profileFields.company = company
    if(website) profileFields.website = website
    if(location) profileFields.location = location
    if(bio) profileFields.bio = bio
    if(status) profileFields.status = status
    if(githubusername) profileFields.githubusername = githubusername
    if(skills) {
        profileFields.skills = skills.split(',').map(skill => skill.trim())
    }
    profileFields.social = {}
    if(twitter) profileFields.social.twitter = twitter
    if(facebook) profileFields.social.facebook = facebook
    if(linkedin) profileFields.social.linkedin = linkedin
    if(instagram) profileFields.social.instagram = instagram

    try{
        let profile = await Profile.findOne({user: req.user.id })
        if(profile) {
            // update
            profile = await Profile.findOneAndUpdate(

                {user: req.user.id},
                {$set: profileFields},
                { new: true}
                )
            return res.json(profile)
        }
        // create profile
        profile = new Profile(profileFields)
        await profile.save();
        res.json(profile)
    } catch (err){
        console.error(err.message)
        res.status(500).send('server error')
    }
});

router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', ['name', 'avatar']);
        res.json(profiles)
        // res.send('jshfsfh')
    } catch (err) {
        console.error(err.message)
        res.status(500).send("Server Error")
    }
})
router.get('/user/:user_id', async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.user_id}).populate('user', ['name', 'avatar']);
        if(!profile){
            return res.status(400).json({ msg: 'profile not found'}) 
        }
        res.json(profile)
        // res.send('jshfsfh')
    } catch (err) {
        console.error(err.message)
        if(err.kind == 'ObjectId'){
            return res.status(400).json({msg: 'profile not found'});
        }
        res.status(500).send("Profile not found")
    }
})
router.delete('/', auth, async (req, res) => {
    try {
        await Post.deleteMany({user: req.user.id})
        await Profile.findOneAndRemove({ user: req.user.id});
        await User.findOneAndRemove({_id: req.user.id})

        res.json({msg: 'user deleted'})
        // res.send('jshfsfh')
    } catch (err) {
        console.error(err.message)
        res.status(500).send("Profile not found")
    }
});

router.put('/experience', [ auth, [
    check('title', 'Title is required').not().isEmpty(),
    check('company', 'Company is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty()
    ] ],
    async (req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    const {
        title,
        company,
        location,
        from,
        to,
        current,
        description
    } = req.body;

    const newExp = {
        title,
        company,
        location,
        from,
        to,
        current,
        description }
        try {
            const profile = await Profile.findOne({ user: req.user.id })
            profile.experience.unshift(newExp)
            await profile.save()
            res.json(profile);


            
        } catch (err) {
            console.error(err.message);
            res.status(500).send("server error")
        }
})

router.delete('/experience/:exp_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id })

        const removeIndex = profile.experience.map((item) => { return item.id}).indexOf(req.params.exp_id);
        profile.experience.splice(removeIndex, 1)
        await profile.save();
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("server error")
    }
})

router.put('/education', [ auth, [
    check('school', 'School is required').not().isEmpty(),
    check('degree', 'Degree is required').not().isEmpty(),
    check('fieldofstudy', 'Field of study is required').not().isEmpty(),
    check('from', 'From date is required').not().isEmpty()
    ] ],
    async (req, res) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    const {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description
    } = req.body;

    const newEdu = {
        school,
        degree,
        fieldofstudy,
        from,
        to,
        current,
        description }
        try {
            const profile = await Profile.findOne({ user: req.user.id })
            profile.education.unshift(newEdu)
            await profile.save()
            res.json(profile);


            
        } catch (err) {
            console.error(err.message);
            res.status(500).send("server error")
        }
})

router.delete('/education/:edu_id', auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.user.id })

        const removeIndex = profile.education.map((item) => { return item.id}).indexOf(req.params.edu_id);
        profile.education.splice(removeIndex, 1)
        await profile.save();
        res.json(profile);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("server error")
    }
})

// showing github repos 
router.get('/github/:username', (req, res) => {
    try {
        const options = {
            uri: `https://api.github.com/users/${req.params.username}/repos?per_page=5&sort=created:asc&client_id=${config.get('githubClientId')}&client_secret=${config.get('githubSecret')}`,
            method: 'GET',
            headers: {'user-agent': 'node.js'}
        }
        request(options, (error, response, body) => {
            if(error){
                console.error(error)
            }
            if(response.statusCode !== 200){
                return res.status(404).json({msg: 'No Github profile found'})
            }
            res.json(JSON.parse(body))
        })




    } catch (err) {
        
    }
})






module.exports = router;